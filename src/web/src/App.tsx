import { useEffect, useState } from "react";
import { api } from "./api/client.js";
import { AppShell, type View } from "./components/AppShell.js";
import { errorText, organizeStatus, startupStatusMessage, type SourceFilter } from "./i18n/messages.js";
import { I18nProvider, useI18n } from "./i18n/use-i18n.js";
import { SettingsWorkspace } from "./workspaces/SettingsWorkspace.js";
import { SourcesWorkspace } from "./workspaces/SourcesWorkspace.js";
import { TodoWorkspace } from "./workspaces/TodoWorkspace.js";
import type { ObservationRecord, OrganizeResult, PublicAppConfig, SessionRecord, SourceSummary, StartupScanStatus, TodoCard } from "./types.js";

const SESSION_PAGE_SIZE = 50;

export function App() {
  return (
    <I18nProvider>
      <WorkbenchApp />
    </I18nProvider>
  );
}

function WorkbenchApp() {
  const { locale, t } = useI18n();
  const [view, setView] = useState<View>("todos");
  const [todos, setTodos] = useState<TodoCard[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sourceSummaries, setSourceSummaries] = useState<SourceSummary[]>([]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sessionOffset, setSessionOffset] = useState(0);
  const [observationsBySession, setObservationsBySession] = useState<Record<string, ObservationRecord[]>>({});
  const [settings, setSettings] = useState<PublicAppConfig | null>(null);
  const [startup, setStartup] = useState<StartupScanStatus | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [highlightedObservationId, setHighlightedObservationId] = useState("");
  const [status, setStatus] = useState(t.status as string);
  const [busy, setBusy] = useState(false);
  const [startupNoticeShown, setStartupNoticeShown] = useState(false);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    void loadSessions(sourceFilter, 0);
  }, [sourceFilter]);

  useEffect(() => {
    if (!selectedSessionId && sessions[0]) setSelectedSessionId(sessions[0].id);
  }, [selectedSessionId, sessions]);

  useEffect(() => {
    if (view !== "sources" || !highlightedObservationId || !observationsBySession[selectedSessionId]) return;
    requestAnimationFrame(() => document.getElementById(`obs-${highlightedObservationId}`)?.scrollIntoView({ block: "center" }));
  }, [view, selectedSessionId, highlightedObservationId, observationsBySession]);

  useEffect(() => {
    if (!startup) return;
    if (startup.status === "indexing") {
      const timer = window.setTimeout(() => void refresh(), 500);
      return () => window.clearTimeout(timer);
    }
    const message = startupStatusMessage(startup, locale);
    if (message && !startupNoticeShown) {
      setStatus(message);
      setStartupNoticeShown(true);
    }
  }, [locale, startup, startupNoticeShown]);

  async function refresh() {
    const [nextTodos, nextSources, nextSettings, nextStartup] = await Promise.all([
      api<TodoCard[]>("/todos"),
      api<SourceSummary[]>("/sources"),
      api<PublicAppConfig>("/settings"),
      api<StartupScanStatus>("/startup/scan")
    ]);
    setTodos(nextTodos);
    setSourceSummaries(nextSources);
    setSettings(nextSettings);
    setStartup(nextStartup);
    await loadSessions(sourceFilter, 0);
  }

  async function loadSessions(filter: SourceFilter, offset: number) {
    const query = new URLSearchParams({
      limit: String(SESSION_PAGE_SIZE),
      offset: String(offset)
    });
    if (filter !== "all") query.set("source", filter);
    const nextSessions = await api<SessionRecord[]>(`/sessions?${query.toString()}`);
    setSessions((current) => offset === 0 ? nextSessions : mergeSessions(current, nextSessions));
    setSessionOffset(offset + nextSessions.length);
    if (offset === 0) {
      setSelectedSessionId(nextSessions[0]?.id ?? "");
      setHighlightedObservationId("");
    }
  }

  async function organize() {
    setBusy(true);
    setStatus(t.organizing as string);
    try {
      const result = await api<OrganizeResult>("/todos/organize", { method: "POST", body: {} });
      await refresh();
      setStatus(organizeStatus(result, locale));
    } catch (error) {
      setStatus((error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function updateTodo(id: string, status: "done" | "ignored") {
    await api<TodoCard>(`/todos/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } });
    await refresh();
  }

  async function openTodoSources(todo: TodoCard) {
    if (!todo.origin) {
      setView("sources");
      setStatus(t.sourceNotLinked as string);
      return;
    }
    const session = await ensureSessionLoaded(todo.origin.sessionId);
    if (!session) {
      setView("sources");
      setStatus(t.linkedSessionMissing as string);
      return;
    }
    setSelectedSessionId(todo.origin.sessionId);
    setHighlightedObservationId(todo.origin.observationId);
    await loadObservations(todo.origin.sessionId);
    setView("sources");
  }

  async function ensureSessionLoaded(sessionId: string): Promise<SessionRecord | null> {
    const existing = sessions.find((session) => session.id === sessionId);
    if (existing) return existing;
    const [session] = await api<SessionRecord[]>(`/sessions?sessionId=${encodeURIComponent(sessionId)}`);
    if (!session) return null;
    setSessions((current) => mergeSessions([session], current));
    return session;
  }

  async function loadObservations(sessionId: string) {
    if (observationsBySession[sessionId]) return;
    const observations = await api<ObservationRecord[]>(`/sessions/${encodeURIComponent(sessionId)}/observations`);
    setObservationsBySession((current) => ({ ...current, [sessionId]: observations }));
  }

  const openTodos = todos.filter((todo) => todo.status === "todo");
  const closedTodos = todos.filter((todo) => todo.status !== "todo");

  return (
    <AppShell
      view={view}
      status={status}
      busy={busy}
      openCount={openTodos.length}
      doneCount={todos.filter((todo) => todo.status === "done").length}
      sourceCount={sessions.length}
      startup={startup}
      onView={setView}
      onRefresh={() => void refresh()}
      onOrganize={() => void organize()}
    >
      {view === "todos" && (
        <TodoWorkspace
          openTodos={openTodos}
          closedTodos={closedTodos}
          onComplete={(id) => void updateTodo(id, "done")}
          onIgnore={(id) => void updateTodo(id, "ignored")}
          onSources={(todo) => void openTodoSources(todo)}
          onOrganize={() => void organize()}
          busy={busy}
        />
      )}
      {view === "sources" && (
        <SourcesWorkspace
          sessions={sessions}
          sourceSummaries={sourceSummaries}
          sourceFilter={sourceFilter}
          sessionOffset={sessionOffset}
          observationsBySession={observationsBySession}
          selectedSessionId={selectedSessionId}
          highlightedObservationId={highlightedObservationId}
          onFilter={(filter) => setSourceFilter(filter)}
          onLoadMore={() => void loadSessions(sourceFilter, sessionOffset)}
          onSelect={(sessionId) => {
            setSelectedSessionId(sessionId);
            void loadObservations(sessionId);
          }}
        />
      )}
      {view === "settings" && settings && (
        <SettingsWorkspace
          settings={settings}
          startup={startup}
          onSaved={async (message) => {
            await refresh();
            setStatus(message ?? (t.settingsSaved as string));
          }}
        />
      )}
    </AppShell>
  );
}

function mergeSessions(first: SessionRecord[], second: SessionRecord[]): SessionRecord[] {
  const seen = new Set<string>();
  return [...first, ...second].filter((session) => {
    if (seen.has(session.id)) return false;
    seen.add(session.id);
    return true;
  });
}
