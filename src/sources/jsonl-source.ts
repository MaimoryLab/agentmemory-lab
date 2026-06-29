import { createHash } from "node:crypto";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import type { SourceKind } from "../contracts.js";
import type { Database } from "../db/index.js";
import { readJsonlFile, type JsonlRecord } from "../parser/jsonl.js";

export interface ScanResult {
  source: SourceKind;
  scanned: number;
  observations: number;
  skipped: number;
}

export function scanJsonlSource(db: Database, source: SourceKind, root: string): ScanResult {
  let scanned = 0;
  let observations = 0;
  let skipped = 0;

  for (const path of listJsonlFiles(root)) {
    const stat = statSync(path);
    const checkpoint = db.prepare(
      "SELECT mtime_ms, size FROM scan_checkpoints WHERE source = ? AND path = ?"
    ).get(source, path) as { mtime_ms: number; size: number } | undefined;

    if (checkpoint?.mtime_ms === stat.mtimeMs && checkpoint.size === stat.size) {
      skipped++;
      continue;
    }

    const sessionId = idFor(source, path);
    const updatedAt = new Date(stat.mtimeMs).toISOString();
    db.prepare(
      "INSERT OR REPLACE INTO sessions (id, source, path, updated_at) VALUES (?, ?, ?, ?)"
    ).run(sessionId, source, path, updatedAt);
    db.prepare("DELETE FROM observations WHERE session_id = ?").run(sessionId);

    for (const record of readJsonlFile(path)) {
      const observation = observationFromRecord(source, sessionId, path, record);
      if (!observation) continue;
      db.prepare(
        "INSERT OR REPLACE INTO observations (id, session_id, source, role, text, created_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).run(observation.id, sessionId, source, observation.role, observation.text, observation.createdAt);
      observations++;
    }

    db.prepare(
      "INSERT OR REPLACE INTO scan_checkpoints (source, path, mtime_ms, size) VALUES (?, ?, ?, ?)"
    ).run(source, path, stat.mtimeMs, stat.size);
    scanned++;
  }

  return { source, scanned, observations, skipped };
}

export function observationFromRecord(
  source: SourceKind,
  sessionId: string,
  path: string,
  record: JsonlRecord
): { id: string; role: string; text: string; createdAt: string } | null {
  const role = stringValue(record.value.role)
    ?? stringValue(objectValue(record.value.message)?.role)
    ?? "unknown";
  const text = textFromValue(record.value.message) ?? textFromValue(record.value);
  if (!text) return null;
  const createdAt = stringValue(record.value.timestamp) ?? stringValue(record.value.created_at) ?? new Date(0).toISOString();
  return {
    id: idFor(source, path, String(record.line)),
    role,
    text,
    createdAt
  };
}

function listJsonlFiles(root: string): string[] {
  const stat = statSync(root);
  if (stat.isFile()) return root.endsWith(".jsonl") ? [root] : [];

  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return listJsonlFiles(path);
    return entry.isFile() && entry.name.endsWith(".jsonl") ? [path] : [];
  });
}

function textFromValue(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    return value.map(textFromValue).filter(Boolean).join("\n").trim() || null;
  }

  const object = value as Record<string, unknown>;
  return stringValue(object.text)
    ?? stringValue(object.content)
    ?? textFromValue(object.content);
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function idFor(...parts: string[]): string {
  return createHash("sha1").update(parts.join("\0")).digest("hex");
}
