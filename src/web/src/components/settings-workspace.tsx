import { ChevronDown, Save, SlidersHorizontal } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { api, localizedUserFacingError } from "../api/client.js";
import { sourceLabel, textFor, type Locale } from "../i18n.js";
import { cn } from "../lib/utils.js";
import type { PublicAppConfig, StartupScanStatus } from "../types.js";
import type { SessionSource, SourceScanResult } from "../view-model.js";
import { Button, Card, Field, Input, SectionTitle, StatusCallout } from "./ui.js";

export function SettingsWorkspace({ settings, startup, locale, onLocale, onSaved }: {
  settings: PublicAppConfig;
  startup: StartupScanStatus | null;
  locale: Locale;
  onLocale: (locale: Locale) => void;
  onSaved: (message?: string) => Promise<void>;
}) {
  const text = textFor(locale);
  const [form, setForm] = useState(settings);
  const [apiKey, setApiKey] = useState("");
  const [clearKey, setClearKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const changedSources = changedSourcePaths(settings.sources, form.sources);
      const saved = await api<PublicAppConfig>("/settings", {
        method: "PUT",
        body: {
          sources: form.sources,
          llm: {
            enabled: form.llm.enabled,
            provider: "openai",
            model: form.llm.model,
            endpoint: form.llm.endpoint,
            thinkingDepth: form.llm.thinkingDepth,
            timeoutMs: form.llm.timeoutMs,
            ...(clearKey ? { apiKey: "" } : apiKey ? { apiKey } : {})
          },
          organize: form.organize
        }
      });
      setForm(saved);
      await onSaved(await scanChangedSources(changedSources, locale));
    } catch (error) {
      setSaveError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-neutral-500" aria-hidden="true" />
          <SectionTitle>{text.settings}</SectionTitle>
        </div>
        <div className="mt-4 space-y-6">
          <section>
            <h2 className="text-base font-semibold">{text.language}</h2>
            <p className="mt-1 text-sm text-neutral-600">{text.languageDescription}</p>
            <div className="mt-3 inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-1">
              {(["zh-CN", "en-US"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={cn(
                    "rounded px-3 py-1.5 text-sm font-medium",
                    locale === option ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600 hover:text-neutral-950"
                  )}
                  aria-pressed={locale === option}
                  onClick={() => onLocale(option)}
                >
                  {option === "zh-CN" ? text.chinese : text.english}
                </button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="text-base font-semibold">{text.sourceSettings}</h2>
            <p className="mt-1 text-sm text-neutral-600">{text.sourceSettingsDescription}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label={text.codexSource}>
                <Input value={form.sources.codex.path ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sources: { ...form.sources, codex: { path: event.target.value } } })} />
              </Field>
              <Field label={text.claudeSource}>
                <Input value={form.sources["claude-code"].path ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sources: { ...form.sources, "claude-code": { path: event.target.value } } })} />
              </Field>
            </div>
            {startup?.discovery.length ? (
              <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{text.discovery}</div>
                <div className="mt-2 grid gap-2 text-sm text-neutral-700">
                  {startup.discovery.map((item) => (
                    <div key={item.source} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className="font-medium">{sourceLabel(item.source, locale)}</span>
                      <span className="text-neutral-600">
                        {discoveryStatusLabel(item.status, locale)}
                        {item.path ? ` · ${item.path}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          <section>
            <h2 className="text-base font-semibold">{text.extraction}</h2>
            <p className="mt-1 text-sm text-neutral-600">{text.extractionDescription}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <Field label={text.lookbackDays}>
                <Input type="number" min={1} value={form.organize.sinceDays} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, organize: { ...form.organize, sinceDays: Number(event.target.value) } })} />
              </Field>
              <Field label={text.maxSessions}>
                <Input type="number" min={1} max={200} value={form.organize.maxSessions} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, organize: { ...form.organize, maxSessions: Number(event.target.value) } })} />
              </Field>
              <Field label={text.apiKey}>
                <Input type="password" placeholder={settings.llm.apiKeyConfigured ? `${text.configured} ${settings.llm.apiKeyMasked}` : text.pasteApiKey} value={apiKey} onChange={(event: ChangeEvent<HTMLInputElement>) => setApiKey(event.target.value)} />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={clearKey} onChange={(event) => setClearKey(event.target.checked)} />
              {text.clearSavedApiKey}
            </label>
          </section>
        </div>
        <Button className="mt-4" onClick={() => void save()} disabled={saving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {text.saveSettings}
        </Button>
        {saveError && <StatusCallout tone="danger" className="mt-3">{saveError}</StatusCallout>}
      </Card>
      <details className="rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          {text.advancedDiagnostics}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="mt-3 grid gap-4 text-sm text-neutral-600 md:grid-cols-2">
          <Field label={text.model}>
            <Input value={form.llm.model} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, llm: { ...form.llm, model: event.target.value } })} />
          </Field>
          <Field label={text.endpoint}>
            <Input value={form.llm.endpoint} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, llm: { ...form.llm, endpoint: event.target.value } })} />
          </Field>
          <p>{text.startupScan}: {startup?.status ?? "idle"}</p>
          <p>{text.extraction}: {settings.llm.apiKeyConfigured ? text.configured : text.needsSetup}</p>
          {startup?.warnings.map((warning: string) => <p key={warning}>{localizedUserFacingError(warning, locale)}</p>)}
        </div>
      </details>
    </div>
  );
}

function changedSourcePaths(
  before: PublicAppConfig["sources"],
  after: PublicAppConfig["sources"]
): SessionSource[] {
  return (["codex", "claude-code"] as const).filter((source) =>
    (before[source].path ?? "").trim() !== (after[source].path ?? "").trim()
  );
}

function discoveryStatusLabel(status: "configured" | "discovered" | "missing", locale: Locale): string {
  const text = textFor(locale);
  if (status === "configured") return text.discoveryConfigured;
  if (status === "discovered") return text.discoveryDiscovered;
  return text.discoveryMissing;
}

async function scanChangedSources(sources: SessionSource[], locale: Locale): Promise<string | undefined> {
  if (sources.length === 0) return undefined;
  const text = textFor(locale);
  const failures: string[] = [];
  for (const source of sources) {
    try {
      const result = await api<SourceScanResult>("/sources/scan", { method: "POST", body: { source } });
      if (result.warning) failures.push(`${sourceLabel(source, locale)}: ${localizedUserFacingError(result.warning, locale)}`);
    } catch (error) {
      failures.push(`${sourceLabel(source, locale)}: ${(error as Error).message}`);
    }
  }
  if (failures.length > 0) return `${text.sourceScanFailed}${failures.join(" ")}`;
  return text.sourceScanFinished;
}
