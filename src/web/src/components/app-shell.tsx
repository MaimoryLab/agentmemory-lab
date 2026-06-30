import { CircleDot, FolderKanban, Loader2, RefreshCw, Settings, Sparkles } from "lucide-react";
import { cn } from "../lib/utils.js";
import type { View } from "../view-model.js";
import { Button, Card, IconButton, SectionTitle } from "./ui.js";

export function AppShell({ view, status, openCount, doneCount, sourcesCount, busy, onView, onRefresh, onOrganize, children }: {
  view: View;
  status: string;
  openCount: number;
  doneCount: number;
  sourcesCount: number;
  busy: boolean;
  onView: (view: View) => void;
  onRefresh: () => void;
  onOrganize: () => void;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-[var(--app-line)] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              AI Todo
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">Action inbox</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600">Review task intent, agent progress, and source trails from recent AI sessions.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label="Refresh" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            <Button aria-label="Organize all recent sessions" title="Organize all recent sessions" onClick={onOrganize} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              Organize
            </Button>
          </div>
        </header>

        <nav className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-[var(--app-line)] bg-[var(--app-bg)]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0" aria-label="Primary">
          <NavButton active={view === "todos"} onClick={() => onView("todos")} icon={<CircleDot className="h-4 w-4" />}>To-Do</NavButton>
          <NavButton active={view === "sources"} onClick={() => onView("sources")} icon={<FolderKanban className="h-4 w-4" />}>Sources</NavButton>
          <NavButton active={view === "settings"} onClick={() => onView("settings")} icon={<Settings className="h-4 w-4" />}>Settings</NavButton>
        </nav>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">{children}</section>
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="p-4">
              <SectionTitle>Status</SectionTitle>
              <p className="mt-2 text-sm text-neutral-700">{status}</p>
            </Card>
            <Card className="p-4">
              <SectionTitle>Review</SectionTitle>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label="Open" value={openCount} />
                <Metric label="Done" value={doneCount} />
                <Metric label="Sources" value={sourcesCount} />
              </dl>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  const label = typeof children === "string" ? `Open ${children}` : undefined;
  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-neutral-600",
        active ? "bg-white text-neutral-950 shadow-sm ring-1 ring-neutral-200" : "hover:bg-white/70"
      )}
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-neutral-50 p-3">
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="text-lg font-semibold">{value}</dd>
    </div>
  );
}
