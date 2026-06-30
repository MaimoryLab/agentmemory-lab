import { CircleDot, FolderKanban, Loader2, RefreshCw, Settings, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button, Card, IconButton, SectionTitle } from "./ui.js";
import { cn } from "../lib/utils.js";
import { useI18n } from "../i18n/use-i18n.js";
import type { StartupScanStatus } from "../types.js";

export type View = "todos" | "sources" | "settings";

export function AppShell(props: {
  view: View;
  status: string;
  busy: boolean;
  openCount: number;
  doneCount: number;
  sourceCount: number;
  startup: StartupScanStatus | null;
  onView: (view: View) => void;
  onRefresh: () => void;
  onOrganize: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <main className="min-h-screen bg-[var(--app-bg)] text-neutral-950">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-neutral-300/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-neutral-500">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t.appName}
            </div>
            <h1 className="text-2xl font-semibold tracking-normal">{t.pageTitle}</h1>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600">{t.pageSubtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <IconButton label={t.refresh as string} onClick={props.onRefresh}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </IconButton>
            <Button aria-label={t.organize as string} title={t.organize as string} onClick={props.onOrganize} disabled={props.busy}>
              {props.busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
              {t.organize}
            </Button>
          </div>
        </header>

        <nav className="sticky top-0 z-10 -mx-4 flex gap-1 overflow-x-auto border-b border-neutral-300/80 bg-[var(--app-bg)]/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0" aria-label="Primary">
          <NavButton active={props.view === "todos"} onClick={() => props.onView("todos")} icon={<CircleDot className="h-4 w-4" />}>{t.navTodos}</NavButton>
          <NavButton active={props.view === "sources"} onClick={() => props.onView("sources")} icon={<FolderKanban className="h-4 w-4" />}>{t.navSources}</NavButton>
          <NavButton active={props.view === "settings"} onClick={() => props.onView("settings")} icon={<Settings className="h-4 w-4" />}>{t.navSettings}</NavButton>
        </nav>

        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">{props.children}</section>
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            <Card className="overflow-hidden">
              <div className="border-l-4 border-blue-600 p-4">
                <SectionTitle>{t.operationalStrip}</SectionTitle>
                <p className="mt-2 text-sm text-neutral-700">{props.status}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge>{props.startup?.status ?? "idle"}</Badge>
                  {(props.startup?.warnings.length ?? 0) > 0 && <Badge className="border-red-200 bg-red-50 text-red-700">{props.startup?.warnings.length}</Badge>}
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <SectionTitle>{t.review}</SectionTitle>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Metric label={t.open as string} value={props.openCount} />
                <Metric label={t.done as string} value={props.doneCount} />
                <Metric label={t.sources as string} value={props.sourceCount} />
              </dl>
            </Card>
          </aside>
        </div>
      </div>
    </main>
  );
}

function NavButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
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
