import { ChevronDown, Save, SlidersHorizontal } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { api } from "../api/client.js";
import { Field } from "../components/Field.js";
import { Badge, Button, Card, Input, SectionTitle } from "../components/ui.js";
import { errorText, sourceLabel, type Locale, type SessionSource } from "../i18n/messages.js";
import { useI18n } from "../i18n/use-i18n.js";
import type { PublicAppConfig, StartupScanStatus } from "../types.js";

type SourceScanResult = { warning?: string };

export function SettingsWorkspace({ settings, startup, onSaved }: { settings: PublicAppConfig; startup: StartupScanStatus | null; onSaved: (message?: string) => Promise<void> }) {
  const { locale, setLocale, t } = useI18n();
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
          <SectionTitle>{t.settingsTitle}</SectionTitle>
        </div>
        <div className="mt-4 space-y-6">
          <section>
            <h2 className="text-base font-semibold">{t.language}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t.languageDescription}</p>
            <div className="mt-3 inline-flex rounded-md border border-neutral-200 bg-neutral-50 p-1" aria-label={t.language as string}>
              {(["zh-CN", "en-US"] as Locale[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded px-3 py-1.5 text-sm font-medium ${locale === option ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-600 hover:text-neutral-950"}`}
                  onClick={() => setLocale(option)}
                >
                  {option === "zh-CN" ? t.chinese : t.english}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold">{t.sourcesSettingsTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t.sourcesSettingsBody}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label={t.codexSource as string}>
                <Input value={form.sources.codex.path ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sources: { ...form.sources, codex: { path: event.target.value } } })} />
              </Field>
              <Field label={t.claudeSource as string}>
                <Input value={form.sources["claude-code"].path ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sources: { ...form.sources, "claude-code": { path: event.target.value } } })} />
              </Field>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-neutral-600 md:grid-cols-2">
              {(startup?.discovery ?? []).map((item) => (
                <div key={item.source} className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                  <span>{sourceLabel(item.source, locale)}</span>
                  <span className="min-w-0 truncate text-right">
                    <Badge className={item.status === "missing" ? "border-amber-200 bg-amber-50 text-amber-700" : "border-blue-200 bg-blue-50 text-blue-700"}>{discoveryLabel(item.status, locale)}</Badge>
                    {item.path && <span className="ml-2 text-xs text-neutral-500">{item.path}</span>}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-base font-semibold">{t.extractionTitle}</h2>
            <p className="mt-1 text-sm text-neutral-600">{t.extractionBody}</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <Field label={t.lookbackDays as string}>
                <Input type="number" min={1} value={form.organize.sinceDays} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, organize: { ...form.organize, sinceDays: Number(event.target.value) } })} />
              </Field>
              <Field label={t.maxSessions as string}>
                <Input type="number" min={1} max={200} value={form.organize.maxSessions} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, organize: { ...form.organize, maxSessions: Number(event.target.value) } })} />
              </Field>
              <Field label={t.apiKey as string}>
                <Input type="password" placeholder={settings.llm.apiKeyConfigured ? (t.apiKeyConfigured as (masked: string) => string)(settings.llm.apiKeyMasked) : t.pasteApiKey as string} value={apiKey} onChange={(event: ChangeEvent<HTMLInputElement>) => setApiKey(event.target.value)} />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={clearKey} onChange={(event) => setClearKey(event.target.checked)} />
              {t.clearApiKey}
            </label>
          </section>
        </div>
        <Button className="mt-4" onClick={() => void save()} disabled={saving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {t.saveSettings}
        </Button>
        {saveError && <p className="mt-3 text-sm text-red-700">{saveError}</p>}
      </Card>
      <details className="rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          {t.advancedDiagnostics}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="mt-3 grid gap-4 text-sm text-neutral-600 md:grid-cols-2">
          <Field label={t.model as string}>
            <Input value={form.llm.model} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, llm: { ...form.llm, model: event.target.value } })} />
          </Field>
          <Field label={t.endpoint as string}>
            <Input value={form.llm.endpoint} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, llm: { ...form.llm, endpoint: event.target.value } })} />
          </Field>
          <p>{t.startupScan}: {startup?.status ?? "idle"}</p>
          <p>{t.extraction}: {settings.llm.apiKeyConfigured ? t.configured : t.needsSetup}</p>
          {startup?.warnings.map((warning: string) => <p key={warning}>{errorText(warning, locale)}</p>)}
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

async function scanChangedSources(sources: SessionSource[], locale: Locale): Promise<string | undefined> {
  if (sources.length === 0) return undefined;
  const failures: string[] = [];
  for (const source of sources) {
    try {
      const result = await api<SourceScanResult>("/sources/scan", { method: "POST", body: { source } });
      if (result.warning) failures.push(`${sourceLabel(source, locale)}: ${errorText(result.warning, locale)}`);
    } catch (error) {
      failures.push(`${sourceLabel(source, locale)}: ${(error as Error).message}`);
    }
  }
  if (failures.length > 0) return locale === "zh-CN" ? `来源扫描失败：${failures.join(" ")}` : `Source scan failed: ${failures.join(" ")}`;
  return locale === "zh-CN" ? "来源扫描完成。" : "Source scan finished.";
}

function discoveryLabel(status: "configured" | "discovered" | "missing", locale: Locale): string {
  if (locale === "zh-CN") {
    if (status === "configured") return "用户已配置";
    if (status === "discovered") return "已自动发现";
    return "未找到";
  }
  if (status === "configured") return "User configured";
  if (status === "discovered") return "Auto-discovered";
  return "Not found";
}
