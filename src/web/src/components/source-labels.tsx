import { Bot, Code2, Globe2, TerminalSquare } from "lucide-react";
import { sourceLabel, textFor, type Locale } from "../i18n.js";
import { cn } from "../lib/utils.js";
import type { SessionRecord, SourceKind, SourceSummary, TodoCard } from "../types.js";
import type { SourceFilter } from "../view-model.js";

export const sourceLabels: Record<SourceKind, string> = {
  codex: "Codex",
  "claude-code": "Claude",
  browser: "Browser"
};

export function SourceIcon({ source }: { source?: SourceKind }) {
  const className = cn("h-4 w-4 shrink-0", source ? "text-neutral-500" : "text-neutral-400");
  if (source === "codex") return <TerminalSquare className={className} aria-hidden="true" />;
  if (source === "claude-code") return <Bot className={className} aria-hidden="true" />;
  if (source === "browser") return <Globe2 className={className} aria-hidden="true" />;
  return <Code2 className={className} aria-hidden="true" />;
}

export function sourceRailClass(source?: SourceKind): string {
  if (source === "codex") return "ledger-rail ledger-rail-codex";
  if (source === "claude-code") return "ledger-rail ledger-rail-claude";
  if (source === "browser") return "ledger-rail ledger-rail-browser";
  return "ledger-rail ledger-rail-missing";
}

export function originLabel(todo: TodoCard, locale: Locale): string {
  const text = textFor(locale);
  if (!todo.origin) return text.sourceUnavailable;
  const source = sourceLabel(todo.origin.source, locale);
  const project = todo.origin.projectTitle || source;
  const session = todo.origin.sessionTitle || text.temporarySession;
  return `${source} · ${project} › ${session}`;
}

export function originProjectLabel(todo: TodoCard, locale: Locale): string {
  const text = textFor(locale);
  if (!todo.origin) return text.sourceUnavailable;
  const source = sourceLabel(todo.origin.source, locale);
  const project = todo.origin.projectTitle || source;
  return `${source} · ${project}`;
}

export function originSessionLabel(todo: TodoCard, locale: Locale): string {
  return todo.origin?.sessionTitle || textFor(locale).temporarySession;
}

export function sourceCount(sources: SourceSummary[], filter: SourceFilter): number {
  if (filter === "all") return sources.reduce((sum, source) => sum + source.sessions, 0);
  return sources.find((source) => source.source === filter)?.sessions ?? 0;
}

export function sessionProjectLabel(session: SessionRecord, locale: Locale): string {
  if (session.source === "browser") return session.path === "browser" ? textFor(locale).browserSessions : readablePathSegment(session.path, locale);
  const parts = session.path.split("/").filter(Boolean);
  if (session.source === "claude-code") return readablePathSegment(parts.at(-2) ?? parts.at(-1), locale);
  return readablePathSegment(parts.at(-3) ?? parts.at(-2) ?? parts.at(-1), locale);
}

function readablePathSegment(value: string | undefined, locale: Locale): string {
  if (!value) return textFor(locale).temporarySession;
  return value.replace(/\.jsonl$/u, "").replace(/^-+|-+$/gu, "").replace(/[-_]+/gu, " ") || textFor(locale).temporarySession;
}
