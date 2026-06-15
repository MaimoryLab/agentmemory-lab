import { spawn, type ChildProcess } from "node:child_process";
import type { ISdk } from "iii-sdk";
import type { StateKV } from "../state/kv.js";
import { makeReplyHandler } from "./lark-reply-consumer.js";
import { logger } from "../logger.js";

// Line D / STEP-D5b — long-running Feishu reply subscriber.
//
// Spawns `lark-cli event consume im.message.receive_v1 --as bot --quiet`,
// splits its stdout into NDJSON lines, and feeds each line to the D5a mapping
// kernel (makeReplyHandler().handleLine). This file owns ONLY process
// lifecycle + line framing — all the parse/filter/dedup/map/answer semantics
// live in lark-reply-consumer.ts and are not touched here.
//
// Default OFF: nothing spawns unless AGENTMEMORY_LARK_REPLY_LOOP=true (the
// caller checks isLarkReplyLoopEnabled() before invoking this).

const CLI = "lark-cli";
const CONSUME_ARGS = [
  "event",
  "consume",
  "im.message.receive_v1",
  "--as",
  "bot",
  "--quiet",
];

// Injectable spawner so tests never start a real lark-cli.
export type SpawnFn = (command: string, args: string[]) => ChildProcess;
const realSpawn: SpawnFn = (command, args) =>
  spawn(command, args, {
    // Strip proxy env so the CLI's own client reaches Feishu directly,
    // mirroring the lark-adapter runner. No shell — argv array only.
    env: (() => {
      const env = { ...process.env, LARK_CLI_NO_PROXY: "1" };
      delete env["HTTPS_PROXY"];
      delete env["HTTP_PROXY"];
      delete env["ALL_PROXY"];
      delete env["https_proxy"];
      delete env["http_proxy"];
      delete env["all_proxy"];
      return env;
    })(),
    stdio: ["pipe", "pipe", "pipe"],
  });

export interface ReplyLoopDeps {
  kv: StateKV;
  sdk: ISdk;
  userId: string;
  spawnFn?: SpawnFn;
}

export interface ReplyLoop {
  stop: () => void;
}

export function startLarkReplyConsumer(deps: ReplyLoopDeps): ReplyLoop {
  const { kv, sdk, userId } = deps;
  const spawnFn = deps.spawnFn ?? realSpawn;
  const handler = makeReplyHandler({ kv, sdk, userId });

  const child = spawnFn(CLI, CONSUME_ARGS);
  let stopped = false;
  // Carry buffer for stdout: a single JSON object may be split across chunks,
  // and the last chunk may end mid-line. Only complete (newline-terminated)
  // lines are handed to the kernel; the remainder is held until more arrives.
  let buf = "";

  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    buf += chunk;
    let nl = buf.indexOf("\n");
    while (nl !== -1) {
      const line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      // handleLine never throws (D5a guarantees it); still guard the .catch
      // so an unexpected async rejection can't crash the worker.
      void handler.handleLine(line).catch((err: unknown) => {
        logger.warn("lark reply loop: handleLine rejected", {
          error: err instanceof Error ? err.message : String(err),
        });
      });
      nl = buf.indexOf("\n");
    }
  });

  // stderr: log a short summary only — NEVER the event body (may contain the
  // user's private message text). lark-cli prints a readiness/au‑th line and
  // any errors here.
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    const summary = String(chunk).trim().slice(0, 200);
    if (summary) logger.warn("lark reply loop stderr", { summary });
  });

  child.on("error", (err: Error) => {
    logger.warn("lark reply loop: spawn error", { error: err.message });
  });

  child.on("exit", (code, signal) => {
    if (stopped) return; // expected shutdown
    // Non-zero / unexpected exit: warn only. We deliberately do NOT auto-restart
    // in this PR — a restart loop risks duplicate consumers / subscription leaks.
    logger.warn("lark reply loop: consumer exited", {
      code,
      signal,
      note: "not auto-restarting (D5b); restart the worker to resubscribe",
    });
  });

  function stop(): void {
    if (stopped) return; // idempotent
    stopped = true;
    try {
      // Graceful: close stdin then SIGTERM. Never kill -9 (would orphan the
      // subscription / skip lark-cli cleanup).
      child.stdin?.end();
      child.kill("SIGTERM");
    } catch (err) {
      logger.warn("lark reply loop: stop error", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { stop };
}

