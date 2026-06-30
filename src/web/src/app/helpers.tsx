import { Bot, Code2, Globe2, TerminalSquare } from "lucide-react";
import type { SourceKind, SourceSummary, TodoCard } from "../types.js";
import { cn } from "../lib/utils.js";
import { sourceLabel, type Locale, type SourceFilter } from "../i18n/messages.js";

export function sourceRailClass(source?: SourceKind): string {
  if (source === "codex") return "bg-blue-500";
  if (source === "claude-code") return "bg-green-500";
  if (source === "browser") return "bg-amber-500";
  return "bg-neutral-300";
}

export function SourceIcon({ source }: { source?: SourceKind }) {
  const className = cn("h-4 w-4 shrink-0", source ? "text-neutral-500" : "text-neutral-400");
  if (source === "codex") return <TerminalSquare className={className} aria-hidden="true" />;
  if (source === "claude-code") return <Bot className={className} aria-hidden="true" />;
  if (source === "browser") return <Globe2 className={className} aria-hidden="true" />;
  return <Code2 className={className} aria-hidden="true" />;
}

export function originLabel(todo: TodoCard, locale: Locale): string {
  if (!todo.origin) return locale === "zh-CN" ? "来源不可用" : "Source unavailable";
  const project = todo.origin.projectTitle || sourceLabel(todo.origin.source, locale);
  const session = todo.origin.sessionTitle || (locale === "zh-CN" ? "临时会话" : "Temporary session");
  return `${sourceLabel(todo.origin.source, locale)} · ${project} › ${session}`;
}

export function originProjectLabel(todo: TodoCard, locale: Locale): string {
  if (!todo.origin) return locale === "zh-CN" ? "来源不可用" : "Source unavailable";
  const project = todo.origin.projectTitle || sourceLabel(todo.origin.source, locale);
  return `${sourceLabel(todo.origin.source, locale)} · ${project}`;
}

export function originSessionLabel(todo: TodoCard, locale: Locale): string {
  return todo.origin?.sessionTitle || (locale === "zh-CN" ? "临时会话" : "Temporary session");
}

export function sourceCount(sources: SourceSummary[], filter: SourceFilter): number {
  if (filter === "all") return sources.reduce((sum, source) => sum + source.sessions, 0);
  return sources.find((source) => source.source === filter)?.sessions ?? 0;
}
