import { createHash } from "node:crypto";
import type { SourceKind } from "../contracts.js";
import type { Database } from "../db/index.js";

export interface BrowserSessionInput {
  id?: string;
  path?: string;
  messages: Array<{ role?: string; text: string; createdAt?: string }>;
}

export function ingestBrowserSession(db: Database, input: BrowserSessionInput) {
  const source: SourceKind = "browser";
  const sessionId = input.id ?? hash(JSON.stringify(input.messages));
  const path = input.path ?? "browser";
  const updatedAt = new Date().toISOString();

  db.prepare(
    "INSERT OR REPLACE INTO sessions (id, source, path, updated_at) VALUES (?, ?, ?, ?)"
  ).run(sessionId, source, path, updatedAt);
  db.prepare("DELETE FROM observations WHERE session_id = ?").run(sessionId);

  for (const [index, message] of input.messages.entries()) {
    db.prepare(
      "INSERT OR REPLACE INTO observations (id, session_id, source, role, text, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      hash(sessionId, String(index)),
      sessionId,
      source,
      message.role ?? "unknown",
      message.text,
      message.createdAt ?? updatedAt
    );
  }

  return { sessionId, observations: input.messages.length };
}

function hash(...parts: string[]): string {
  return createHash("sha1").update(parts.join("\0")).digest("hex");
}
