import { Archive, CheckCircle2, ChevronDown, Eye, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils.js";
import type { TodoCard } from "../types.js";
import { Badge, Button, Card, IconButton, SectionTitle } from "./ui.js";
import { originLabel, originProjectLabel, originSessionLabel, SourceIcon, sourceRailClass } from "./source-labels.js";

const OPEN_GROUP_PREVIEW_LIMIT = 6;

export function TodoBoard(props: {
  openTodos: TodoCard[];
  closedTodos: TodoCard[];
  onComplete: (id: string) => void;
  onIgnore: (id: string) => void;
  onSources: (todo: TodoCard) => void;
  onOrganize: () => void;
  busy: boolean;
}) {
  const [showClosed, setShowClosed] = useState(false);
  const [expandedOpenGroups, setExpandedOpenGroups] = useState<Record<string, boolean>>({});
  if (props.openTodos.length === 0 && props.closedTodos.length === 0) {
    return (
      <Card className="flex min-h-80 flex-col items-center justify-center p-6 text-center">
        <Sparkles className="h-10 w-10 text-neutral-400" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold">No cards yet</h2>
        <p className="mt-1 max-w-md text-sm text-neutral-600">Organize recent sessions into a focused action inbox.</p>
        <Button aria-label="Organize empty inbox" title="Organize empty inbox" className="mt-4" onClick={props.onOrganize} disabled={props.busy}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Organize
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SectionTitle>To-Do</SectionTitle>
          <h2 className="text-xl font-semibold tracking-normal">Open loops first</h2>
          <p className="mt-1 text-sm text-neutral-600">Grouped by agent progress so the next review pass starts with the riskiest work.</p>
        </div>
        <Badge className="self-start border-blue-200 bg-blue-50 text-blue-700">{props.openTodos.length} open</Badge>
      </div>
      {todoGroups(props.openTodos).map((group) => {
        const expanded = expandedOpenGroups[group.key] ?? false;
        const visibleTodos = expanded ? group.todos : group.todos.slice(0, OPEN_GROUP_PREVIEW_LIMIT);
        const hiddenCount = group.todos.length - visibleTodos.length;
        return (
          <section key={group.key} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-3 py-2 text-left"
              aria-expanded={expanded}
              onClick={() => setExpandedOpenGroups((current) => ({ ...current, [group.key]: !expanded }))}
            >
              <span className="min-w-0">
                <h3 className="text-sm font-semibold text-neutral-800">{group.label}</h3>
                <span className="block truncate text-xs text-neutral-500">{group.description}</span>
              </span>
              <span className="inline-flex items-center gap-2">
                <Badge className={group.badgeClass}>{group.todos.length}</Badge>
                <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition", expanded && "rotate-180")} aria-hidden="true" />
              </span>
            </button>
            <div className="divide-y divide-neutral-100">
              {visibleTodos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onComplete={props.onComplete} onIgnore={props.onIgnore} onSources={props.onSources} compactStatus />
              ))}
              {hiddenCount > 0 && (
                <div className="p-3">
                  <Button variant="secondary" className="w-full" onClick={() => setExpandedOpenGroups((current) => ({ ...current, [group.key]: true }))}>
                    Show {hiddenCount} more
                  </Button>
                </div>
              )}
            </div>
          </section>
        );
      })}
      {props.closedTodos.length > 0 && (
        <section className="rounded-lg border border-neutral-200 bg-white p-3">
          <button className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-neutral-700" type="button" aria-expanded={showClosed} onClick={() => setShowClosed(!showClosed)}>
            Completed / ignored
            <span className="inline-flex items-center gap-2 text-xs font-medium text-neutral-500">
              {props.closedTodos.length}
              <ChevronDown className={cn("h-4 w-4 transition", showClosed && "rotate-180")} aria-hidden="true" />
            </span>
          </button>
          {showClosed && (
            <div className="mt-3 space-y-3">
              {props.closedTodos.map((todo) => (
                <TodoItem key={todo.id} todo={todo} onComplete={props.onComplete} onIgnore={props.onIgnore} onSources={props.onSources} muted />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function todoGroups(todos: TodoCard[]): Array<{ key: string; label: string; description: string; badgeClass: string; todos: TodoCard[] }> {
  const groups = [
    { key: "blocked", label: "Blocked", description: "Needs a decision, credential, or missing source.", badgeClass: "border-red-200 bg-red-50 text-red-700", todos: [] as TodoCard[] },
    { key: "in_progress", label: "In progress", description: "Agent has started work; review what changed.", badgeClass: "border-blue-200 bg-blue-50 text-blue-700", todos: [] as TodoCard[] },
    { key: "needs_review", label: "Needs review", description: "Ready for human triage or follow-up.", badgeClass: "border-amber-200 bg-amber-50 text-amber-700", todos: [] as TodoCard[] }
  ];
  for (const todo of todos) {
    const state = todo.metadata.completionState?.toLowerCase().replace(/\s+/g, "_");
    const target = groups.find((group) => group.key === state) ?? groups[2];
    target.todos.push(todo);
  }
  return groups.filter((group) => group.todos.length > 0);
}

function TodoItem({ todo, muted, compactStatus, onComplete, onIgnore, onSources }: {
  todo: TodoCard;
  muted?: boolean;
  compactStatus?: boolean;
  onComplete: (id: string) => void;
  onIgnore: (id: string) => void;
  onSources: (todo: TodoCard) => void;
}) {
  return (
    <Card className={cn("relative overflow-hidden rounded-none border-0 border-b border-neutral-100 p-4 shadow-none last:border-b-0", muted && "opacity-70")}>
      <div className={cn("absolute inset-y-0 left-0 w-1", sourceRailClass(todo.origin?.source))} aria-hidden="true" />
      <div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {!compactStatus && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={todo.status === "todo" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-green-200 bg-green-50 text-green-700"}>{todo.status === "todo" ? "Open" : todo.status === "done" ? "Done" : "Ignored"}</Badge>
              {todo.metadata.completionState && <Badge>{todo.metadata.completionState}</Badge>}
            </div>
          )}
          <h3 className="break-words text-lg font-semibold tracking-normal">{todo.title}</h3>
          <p className="break-words text-sm leading-6 text-neutral-700">{todo.description}</p>
          {todo.metadata.completionSummary && (
            <p className="break-words text-sm text-neutral-500">
              <span className="font-medium text-neutral-600">Agent:</span> {todo.metadata.completionSummary}
            </p>
          )}
          <button aria-label={`Open source session for ${todo.title}`} className="flex max-w-full items-start gap-2 rounded-md text-left text-sm text-neutral-500 hover:text-neutral-950 disabled:cursor-not-allowed disabled:opacity-70" type="button" title={originLabel(todo)} disabled={!todo.origin} onClick={() => onSources(todo)}>
            <SourceIcon source={todo.origin?.source} />
            <span className="min-w-0">
              <span className="block truncate font-medium text-neutral-600">{originProjectLabel(todo)}</span>
              <span className="block truncate text-xs text-neutral-500">{originSessionLabel(todo)}</span>
            </span>
          </button>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <Button aria-label={`Complete ${todo.title}`} variant="secondary" onClick={() => onComplete(todo.id)}>
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Complete
          </Button>
          <Button aria-label={`Open sources for ${todo.title}`} variant="secondary" onClick={() => onSources(todo)}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            Sources
          </Button>
          <IconButton label={`Ignore ${todo.title}`} onClick={() => onIgnore(todo.id)}>
            <Archive className="h-4 w-4" aria-hidden="true" />
          </IconButton>
        </div>
      </div>
    </Card>
  );
}
