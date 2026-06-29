import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync } from "node:fs";
import type { SourceKind } from "../contracts.js";
import type { Database } from "../db/index.js";
import { ingestBrowserSession } from "../sources/browser.js";
import { scanClaudeCodeSessions } from "../sources/claude-code.js";
import { scanCodexSessions } from "../sources/codex.js";
import { listSessionObservations, listSessions, listSources } from "../sources/service.js";
import { getOrganizeRun, listTodos, organizeTodos, updateTodoStatus } from "../todos/service.js";

export function createAppServer(options: { db?: Database } = {}) {
  return createServer(async (req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;

    if (req.method === "GET" && path === "/healthz") {
      writeJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && path === "/sources") {
      const db = requireDb(res, options.db);
      if (!db) return;
      writeJson(res, 200, listSources(db));
      return;
    }

    if (req.method === "POST" && path === "/sources/scan") {
      const db = requireDb(res, options.db);
      if (!db) return;
      const body = await readJson(req, res);
      if (!body) return;
      const result = scanSource(db, body);
      writeJson(res, result.status, result.body);
      return;
    }

    if (req.method === "GET" && path === "/sessions") {
      const db = requireDb(res, options.db);
      if (!db) return;
      writeJson(res, 200, listSessions(db));
      return;
    }

    const sessionObservationsMatch = path.match(/^\/sessions\/([^/]+)\/observations$/);
    if (req.method === "GET" && sessionObservationsMatch) {
      const db = requireDb(res, options.db);
      if (!db) return;
      const observations = listSessionObservations(db, decodeURIComponent(sessionObservationsMatch[1]));
      if (!observations) {
        writeJson(res, 404, { error: "session_not_found" });
        return;
      }
      writeJson(res, 200, observations);
      return;
    }

    if (req.method === "POST" && path === "/browser/sessions") {
      const db = requireDb(res, options.db);
      if (!db) return;
      const body = await readJson(req, res);
      if (!body) return;
      writeJson(res, 200, ingestBrowserSession(db, body));
      return;
    }

    if (req.method === "POST" && path === "/todos/organize") {
      const db = requireDb(res, options.db);
      if (!db) return;
      writeJson(res, 200, organizeTodos(db));
      return;
    }

    if (req.method === "GET" && path === "/todos") {
      const db = requireDb(res, options.db);
      if (!db) return;
      writeJson(res, 200, listTodos(db));
      return;
    }

    const todoMatch = path.match(/^\/todos\/([^/]+)$/);
    if (req.method === "PATCH" && todoMatch) {
      const db = requireDb(res, options.db);
      if (!db) return;
      const body = await readJson(req, res);
      if (!body) return;
      if (body.status !== "done" && body.status !== "ignored") {
        writeJson(res, 400, { error: "invalid_status" });
        return;
      }
      const id = decodeURIComponent(todoMatch[1]);
      if (!updateTodoStatus(db, id, body.status)) {
        writeJson(res, 404, { error: "todo_not_found" });
        return;
      }
      writeJson(res, 200, listTodos(db).find((todo) => todo.id === id));
      return;
    }

    const organizeRunMatch = path.match(/^\/organize-runs\/([^/]+)$/);
    if (req.method === "GET" && organizeRunMatch) {
      const db = requireDb(res, options.db);
      if (!db) return;
      const run = getOrganizeRun(db, decodeURIComponent(organizeRunMatch[1]));
      if (!run) {
        writeJson(res, 404, { error: "organize_run_not_found" });
        return;
      }
      writeJson(res, 200, run);
      return;
    }

    writeJson(res, 404, { error: "not_found" });
  });
}

function writeJson(res: ServerResponse<IncomingMessage>, status: number, body: unknown): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(body));
}

function requireDb(res: ServerResponse<IncomingMessage>, db: Database | undefined): Database | null {
  if (db) return db;
  writeJson(res, 503, { error: "database_unavailable" });
  return null;
}

async function readJson(req: IncomingMessage, res: ServerResponse<IncomingMessage>): Promise<any | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    writeJson(res, 400, { error: "invalid_json" });
    return null;
  }
}

function scanSource(db: Database, body: any) {
  if (!isSessionSource(body?.source)) {
    return { status: 400, body: { error: "unsupported_source" } };
  }
  if (typeof body.path !== "string" || !body.path) {
    return { status: 400, body: { error: "missing_path" } };
  }
  if (!existsSync(body.path)) {
    return { status: 400, body: { error: "path_not_found" } };
  }

  const result = body.source === "codex"
    ? scanCodexSessions(db, body.path)
    : scanClaudeCodeSessions(db, body.path);
  return { status: 200, body: result };
}

function isSessionSource(source: unknown): source is Extract<SourceKind, "codex" | "claude-code"> {
  return source === "codex" || source === "claude-code";
}
