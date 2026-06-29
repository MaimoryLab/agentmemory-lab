import type { OrganizeResult, SourceKind, TodoCard } from "../contracts.js";
import type { Database } from "../db/index.js";
import { extractRuleCandidate, stableId } from "../extract/rules.js";

export interface TodoEvidence {
  id: string;
  observationId: string;
  text: string;
}

export interface TodoEnhancer {
  enhance(candidate: { title: string; description: string; mergeKey: string; evidenceText: string }): Promise<{ title?: string; description?: string } | null>;
}

export interface OrganizeOptions {
  enhancer?: TodoEnhancer["enhance"];
}

export async function organizeTodos(db: Database, options: OrganizeOptions = {}): Promise<OrganizeResult> {
  const started = Date.now();
  const runId = stableId("organize", new Date(started).toISOString(), Math.random().toString(36));
  const observations = db.prepare(
    "SELECT id, source, role, text FROM observations ORDER BY created_at, id"
  ).all() as Array<{ id: string; source: SourceKind; role: string; text: string }>;
  const sourceCounts = new Map<SourceKind, number>();
  let created = 0;
  let updated = 0;
  let enhanced = false;
  const warnings = new Set<string>();

  for (const observation of observations) {
    sourceCounts.set(observation.source, (sourceCounts.get(observation.source) ?? 0) + 1);
    if (observation.role !== "user") continue;

    const candidate = extractRuleCandidate(observation.text);
    if (!candidate) continue;
    if (!options.enhancer) warnings.add("llm_enhancer_unavailable");
    const card = await enhanceCandidate({ ...candidate, evidenceText: observation.text }, options.enhancer, warnings);
    enhanced ||= card.enhanced;

    const todoId = stableId(candidate.mergeKey);
    const now = new Date().toISOString();
    const existing = db.prepare("SELECT id FROM todos WHERE id = ?").get(todoId);
    if (existing) {
      db.prepare(
        "UPDATE todos SET description = ?, updated_at = ? WHERE id = ?"
      ).run(card.description, now, todoId);
      updated++;
    } else {
      db.prepare(
        "INSERT INTO todos (id, title, description, status, updated_at) VALUES (?, ?, ?, 'todo', ?)"
      ).run(todoId, card.title, card.description, now);
      created++;
    }

    db.prepare(
      "INSERT OR REPLACE INTO evidence (id, todo_id, observation_id, text) VALUES (?, ?, ?, ?)"
    ).run(stableId(todoId, observation.id), todoId, observation.id, observation.text);
  }

  const result: OrganizeResult = {
    runId,
    scanned: observations.length,
    sources: Array.from(sourceCounts, ([source, scanned]) => ({ source, scanned })),
    created,
    updated,
    completed: 0,
    ignored: 0,
    engine: enhanced ? "rules+llm" : "rules",
    warnings: Array.from(warnings),
    durationMs: Date.now() - started
  };

  db.prepare(
    "INSERT INTO organize_runs (id, result_json, created_at) VALUES (?, ?, ?)"
  ).run(runId, JSON.stringify(result), new Date().toISOString());
  return result;
}

async function enhanceCandidate(
  candidate: { title: string; description: string; mergeKey: string; evidenceText: string },
  enhancer: OrganizeOptions["enhancer"],
  warnings: Set<string>
): Promise<{ title: string; description: string; enhanced: boolean }> {
  if (!enhancer) return { title: candidate.title, description: candidate.description, enhanced: false };
  try {
    const enhanced = await enhancer(candidate);
    if (!enhanced) {
      warnings.add("llm_enhancer_invalid");
      return { title: candidate.title, description: candidate.description, enhanced: false };
    }
    if (enhanced.title !== undefined && (typeof enhanced.title !== "string" || !enhanced.title.trim())) {
      warnings.add("llm_enhancer_invalid");
      return { title: candidate.title, description: candidate.description, enhanced: false };
    }
    if (enhanced.description !== undefined && (typeof enhanced.description !== "string" || !enhanced.description.trim())) {
      warnings.add("llm_enhancer_invalid");
      return { title: candidate.title, description: candidate.description, enhanced: false };
    }
    return {
      title: enhanced.title?.trim() ?? candidate.title,
      description: enhanced.description?.trim() ?? candidate.description,
      enhanced: true
    };
  } catch {
    warnings.add("llm_enhancer_failed");
    return { title: candidate.title, description: candidate.description, enhanced: false };
  }
}

export function listTodos(db: Database): TodoCard[] {
  return db.prepare(
    `SELECT
      todos.id,
      todos.title,
      todos.description,
      todos.status,
      todos.updated_at as updatedAt,
      COALESCE(json_group_array(evidence.id) FILTER (WHERE evidence.id IS NOT NULL), '[]') as evidenceIds
    FROM todos
    LEFT JOIN evidence ON evidence.todo_id = todos.id
    GROUP BY todos.id
    ORDER BY todos.updated_at DESC`
  ).all().map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      title: String(record.title),
      description: String(record.description),
      status: record.status as TodoCard["status"],
      updatedAt: String(record.updatedAt),
      evidenceIds: JSON.parse(String(record.evidenceIds))
    };
  });
}

export function updateTodoStatus(db: Database, id: string, status: "done" | "ignored"): boolean {
  const result = db.prepare(
    "UPDATE todos SET status = ?, updated_at = ? WHERE id = ?"
  ).run(status, new Date().toISOString(), id);
  return result.changes > 0;
}

export function listTodoEvidence(db: Database, todoId: string): TodoEvidence[] | null {
  const todo = db.prepare("SELECT id FROM todos WHERE id = ?").get(todoId);
  if (!todo) return null;
  return db.prepare(
    "SELECT id, observation_id as observationId, text FROM evidence WHERE todo_id = ? ORDER BY id"
  ).all(todoId).map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: String(record.id),
      observationId: String(record.observationId),
      text: String(record.text)
    };
  });
}

export function getOrganizeRun(db: Database, id: string): OrganizeResult | null {
  const row = db.prepare(
    "SELECT result_json as resultJson FROM organize_runs WHERE id = ?"
  ).get(id) as { resultJson: string } | undefined;
  return row ? JSON.parse(row.resultJson) as OrganizeResult : null;
}
