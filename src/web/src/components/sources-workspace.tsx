import { ChevronDown, FolderOpen, MessageSquareText, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { sourceLabel, textFor, type Locale } from "../i18n.js";
import { cn } from "../lib/utils.js";
import type { ObservationRecord, SessionRecord, SourceSummary } from "../types.js";
import type { SourceFilter } from "../view-model.js";
import { Badge, Button, Card, Input, SectionTitle, SegmentedFilter } from "./ui.js";
import { sessionProjectLabel, sourceCount, SourceIcon } from "./source-labels.js";

const SESSION_GROUP_PREVIEW_LIMIT = 6;
const OBSERVATION_PREVIEW_LIMIT = 12;

export function SourcesWorkspace({ sessions, sourceSummaries, sourceFilter, sessionOffset, observationsBySession, selectedSessionId, highlightedObservationId, locale, onFilter, onLoadMore, onSelect }: {
  sessions: SessionRecord[];
  sourceSummaries: SourceSummary[];
  sourceFilter: SourceFilter;
  sessionOffset: number;
  observationsBySession: Record<string, ObservationRecord[]>;
  selectedSessionId: string;
  highlightedObservationId: string;
  locale: Locale;
  onFilter: (filter: SourceFilter) => void;
  onLoadMore: () => void;
  onSelect: (sessionId: string) => void;
}) {
  const text = textFor(locale);
  const [query, setQuery] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showAllMessages, setShowAllMessages] = useState(false);
  const selected = sessions.find((session) => session.id === selectedSessionId) ?? (selectedSessionId ? undefined : sessions[0]);
  const observations = selected ? observationsBySession[selected.id] ?? [] : [];
  const visibleObservations = showAllMessages ? observations : observations.slice(0, OBSERVATION_PREVIEW_LIMIT);
  const totalSessions = sourceFilter === "all"
    ? sourceSummaries.reduce((sum, source) => sum + source.sessions, 0)
    : sourceSummaries.find((source) => source.source === sourceFilter)?.sessions ?? 0;
  const filters: SourceFilter[] = ["all", "codex", "claude-code", "browser"];
  const filteredSessions = sessions.filter((session) => matchesSessionQuery(session, query, locale));
  const groups = sessionGroups(filteredSessions, locale);

  useEffect(() => {
    setShowAllMessages(false);
  }, [selectedSessionId]);

  return (
    <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="min-w-0 p-3">
        <div className="mb-3 space-y-3 px-1">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-neutral-400" aria-hidden="true" />
            <SectionTitle>{text.sources}</SectionTitle>
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <Input aria-label={text.searchSources} placeholder={text.searchSources} value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" />
          </label>
          <SegmentedFilter aria-label={text.sourceFilter}>
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium",
                  sourceFilter === filter ? "bg-neutral-950 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                )}
                onClick={() => onFilter(filter)}
              >
                {filter === "all" ? text.all : sourceLabel(filter, locale)}
                <span>{sourceCount(sourceSummaries, filter)}</span>
              </button>
            ))}
          </SegmentedFilter>
        </div>
        <div className="max-h-[calc(100vh-220px)] space-y-2 overflow-y-auto pr-1">
          {sessions.length === 0 && <div className="rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">{text.connectSource}</div>}
          {sessions.length > 0 && groups.length === 0 && <div className="rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">{text.noSessionsMatch}</div>}
          {groups.map((group) => {
            const expanded = expandedGroups[group.key] ?? false;
            const visibleSessions = expanded ? group.sessions : group.sessions.slice(0, SESSION_GROUP_PREVIEW_LIMIT);
            const hiddenCount = group.sessions.length - visibleSessions.length;
            return (
              <section key={group.key} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
                <button
                  type="button"
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 border-b border-neutral-100 bg-neutral-50/70 px-3 py-2 text-left"
                  onClick={() => setExpandedGroups((current) => ({ ...current, [group.key]: !expanded }))}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <FolderOpen className="h-4 w-4 shrink-0 text-neutral-500" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-neutral-800">{group.label}</span>
                      <span className="block text-xs text-neutral-500">{text.sessionCount(group.sessions.length)}</span>
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 text-neutral-500 transition", expanded && "rotate-180")} aria-hidden="true" />
                </button>
                <div className="divide-y divide-neutral-100">
                  {visibleSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={cn(
                        "w-full p-3 text-left transition",
                        selected?.id === session.id ? "bg-blue-50" : "bg-white hover:bg-neutral-50"
                      )}
                      onClick={() => {
                        setShowAllMessages(false);
                        onSelect(session.id);
                      }}
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <SourceIcon source={session.source} />
                        <span className="truncate">{sourceLabel(session.source, locale)}</span>
                      </div>
                      <div className="mt-1 truncate text-sm text-neutral-600">{session.preview || text.temporarySession}</div>
                      <div className="mt-2 text-xs text-neutral-400">{text.messageCount(session.observationCount)}</div>
                    </button>
                  ))}
                  {hiddenCount > 0 && (
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-50"
                      onClick={() => setExpandedGroups((current) => ({ ...current, [group.key]: true }))}
                    >
                      {text.moreSessions(hiddenCount)}
                    </button>
                  )}
                </div>
              </section>
            );
          })}
          {sessionOffset < totalSessions && (
            <Button variant="secondary" className="w-full" onClick={onLoadMore}>
              {text.loadMore}
            </Button>
          )}
        </div>
      </Card>
      <Card className="min-w-0 p-4">
        {selected ? (
          <>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SectionTitle>{sourceLabel(selected.source, locale)}</SectionTitle>
                <h2 className="truncate text-xl font-semibold tracking-normal">{selected.preview || text.temporarySession}</h2>
              </div>
              <Badge>{text.messageCount(selected.observationCount)}</Badge>
            </div>
            <div className="max-h-[calc(100vh-220px)] space-y-3 overflow-y-auto pr-1">
              {observations.length === 0 && <div className="rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">{text.selectSource}</div>}
              {visibleObservations.map((observation) => (
                <article
                  id={`obs-${observation.id}`}
                  key={observation.id}
                  className={cn(
                    "rounded-md border border-neutral-200 bg-white p-3",
                    highlightedObservationId === observation.id && "border-amber-300 bg-amber-50"
                  )}
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-500">
                    <span className="capitalize">{observation.role === "unknown" ? text.message : observation.role}</span>
                    <time>{new Date(observation.createdAt).toLocaleString()}</time>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800">{observation.text}</p>
                </article>
              ))}
              {!showAllMessages && observations.length > visibleObservations.length && (
                <Button variant="secondary" className="w-full" onClick={() => setShowAllMessages(true)}>
                  <MessageSquareText className="h-4 w-4" aria-hidden="true" />
                  {text.showAllMessages}
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-md bg-neutral-50 p-4 text-sm text-neutral-600">{text.noSourceSessions}</div>
        )}
      </Card>
    </div>
  );
}

function sessionGroups(sessions: SessionRecord[], locale: Locale): Array<{ key: string; label: string; sessions: SessionRecord[] }> {
  const groups = new Map<string, { key: string; label: string; sessions: SessionRecord[] }>();
  for (const session of sessions) {
    const label = sessionProjectLabel(session, locale);
    const key = `${session.source}:${label}`;
    const group = groups.get(key) ?? { key, label, sessions: [] };
    group.sessions.push(session);
    groups.set(key, group);
  }
  return [...groups.values()];
}

function matchesSessionQuery(session: SessionRecord, query: string, locale: Locale): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [sourceLabel(session.source, locale), sessionProjectLabel(session, locale), session.preview, session.path]
    .some((value) => value.toLowerCase().includes(term));
}
