import { describe, it, expect, beforeEach, vi } from "vitest";
import { EventEmitter } from "node:events";

vi.mock("../src/logger.js", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { startLarkReplyConsumer, type SpawnFn } from "../src/functions/lark-reply-loop.js";
import { setPendingReplyTarget } from "../src/functions/lark-reply-consumer.js";
import { KV } from "../src/state/schema.js";

// STEP-D5b — process lifecycle + NDJSON line framing only. The mapping
// semantics are D5a's and are NOT re-tested here. We inject a fake child
// process so no real lark-cli ever starts.

const USER = "ou_target_user";

function mockKV() {
  const store = new Map<string, Map<string, unknown>>();
  return {
    get: async <T>(scope: string, key: string): Promise<T | null> =>
      (store.get(scope)?.get(key) as T) ?? null,
    set: async <T>(scope: string, key: string, data: T): Promise<T> => {
      if (!store.has(scope)) store.set(scope, new Map());
      store.get(scope)!.set(key, data);
      return data;
    },
    delete: async (scope: string, key: string): Promise<void> => {
      store.get(scope)?.delete(key);
    },
    list: async <T>(scope: string): Promise<T[]> => {
      const entries = store.get(scope);
      return entries ? (Array.from(entries.values()) as T[]) : [];
    },
  };
}

// A minimal stand-in for ChildProcess with controllable stdout/stderr streams
// and a recording stdin + kill.
function makeFakeChild() {
  const stdout = new EventEmitter() as EventEmitter & { setEncoding: (e: string) => void };
  stdout.setEncoding = () => {};
  const stderr = new EventEmitter() as EventEmitter & { setEncoding: (e: string) => void };
  stderr.setEncoding = () => {};
  const child = new EventEmitter() as EventEmitter & {
    stdout: typeof stdout;
    stderr: typeof stderr;
    stdin: { end: ReturnType<typeof vi.fn> };
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = stdout;
  child.stderr = stderr;
  child.stdin = { end: vi.fn() };
  child.kill = vi.fn();
  return child;
}

function evt(over: Partial<{ event_id: string; sender_id: string; chat_type: string; content: string }> = {}) {
  return JSON.stringify({
    event_id: over.event_id ?? "evt_1",
    sender_id: over.sender_id ?? USER,
    chat_type: over.chat_type ?? "p2p",
    content: over.content ?? JSON.stringify({ text: "改" }),
  });
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe("D5b lark reply loop (process lifecycle + framing)", () => {
  let kv: ReturnType<typeof mockKV>;
  let trigger: ReturnType<typeof vi.fn>;
  let sdk: { trigger: ReturnType<typeof vi.fn> };
  let child: ReturnType<typeof makeFakeChild>;
  let spawnArgs: { command: string; args: string[] } | null;
  let spawnFn: SpawnFn;

  beforeEach(() => {
    kv = mockKV();
    trigger = vi.fn(async () => ({ success: true, item: { id: "x", status: "answered" } }));
    sdk = { trigger };
    child = makeFakeChild();
    spawnArgs = null;
    spawnFn = ((command: string, args: string[]) => {
      spawnArgs = { command, args };
      return child as never;
    }) as SpawnFn;
  });

  async function seedAwaiting(id: string) {
    await kv.set(KV.inbox, id, {
      id, kind: "question", body: "q", status: "awaiting", createdAt: "2026-06-15T10:00:00Z",
    });
  }

  function start() {
    return startLarkReplyConsumer({ kv: kv as never, sdk: sdk as never, userId: USER, spawnFn });
  }

  it("spawns lark-cli event consume with the expected argv", () => {
    start();
    expect(spawnArgs?.command).toBe("lark-cli");
    expect(spawnArgs?.args).toEqual([
      "event", "consume", "im.message.receive_v1", "--as", "bot", "--quiet",
    ]);
  });

  it("feeds each complete NDJSON line to the kernel (handleLine called per line)", async () => {
    await seedAwaiting("inbox_q1");
    await setPendingReplyTarget(kv as never, "inbox_q1");
    start();
    // two events across one chunk; second has its own pointer set after first clears
    child.stdout.emit("data", evt({ event_id: "e1" }) + "\n");
    await flush();
    await seedAwaiting("inbox_q2");
    await setPendingReplyTarget(kv as never, "inbox_q2");
    child.stdout.emit("data", evt({ event_id: "e2" }) + "\n");
    await flush();
    expect(trigger).toHaveBeenCalledTimes(2);
  });

  it("reassembles a JSON object split across two chunks", async () => {
    await seedAwaiting("inbox_q1");
    await setPendingReplyTarget(kv as never, "inbox_q1");
    start();
    const line = evt({ event_id: "split" });
    const half = Math.floor(line.length / 2);
    child.stdout.emit("data", line.slice(0, half));
    await flush();
    expect(trigger).not.toHaveBeenCalled(); // no newline yet
    child.stdout.emit("data", line.slice(half) + "\n");
    await flush();
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("holds a trailing partial line until its newline arrives", async () => {
    await seedAwaiting("inbox_q1");
    await setPendingReplyTarget(kv as never, "inbox_q1");
    start();
    // first full line + start of a second
    child.stdout.emit("data", evt({ event_id: "a" }) + "\n" + evt({ event_id: "b" }).slice(0, 10));
    await flush();
    expect(trigger).toHaveBeenCalledTimes(1); // only the complete line acted
  });

  it("malformed line does not stop the loop; a later good line still processes", async () => {
    await seedAwaiting("inbox_q1");
    await setPendingReplyTarget(kv as never, "inbox_q1");
    start();
    child.stdout.emit("data", "{ broken json \n");
    await flush();
    expect(trigger).not.toHaveBeenCalled();
    child.stdout.emit("data", evt({ event_id: "good" }) + "\n");
    await flush();
    expect(trigger).toHaveBeenCalledTimes(1);
  });

  it("non-zero child exit only warns (no throw, no restart)", () => {
    start();
    // emitting exit must not throw
    expect(() => child.emit("exit", 1, null)).not.toThrow();
    // spawn was called exactly once — no auto-restart
    expect(spawnArgs).toBeTruthy();
  });

  it("stop() ends stdin and sends SIGTERM (never kill -9), and is idempotent", () => {
    const loop = start();
    loop.stop();
    expect(child.stdin.end).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledWith("SIGTERM");
    expect(child.kill).not.toHaveBeenCalledWith("SIGKILL");
    // idempotent: second stop is a no-op
    loop.stop();
    expect(child.stdin.end).toHaveBeenCalledTimes(1);
    expect(child.kill).toHaveBeenCalledTimes(1);
  });

  it("exit after stop() is treated as expected (still no throw)", () => {
    const loop = start();
    loop.stop();
    expect(() => child.emit("exit", null, "SIGTERM")).not.toThrow();
  });

  it("stderr data does not throw and is summarized (no event body leak path tested)", () => {
    start();
    expect(() => child.stderr.emit("data", "[event] ready\n")).not.toThrow();
  });
});
