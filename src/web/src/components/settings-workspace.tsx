import { ChevronDown, Save, SlidersHorizontal } from "lucide-react";
import { useState, type ChangeEvent } from "react";
import { api, userFacingError } from "../api/client.js";
import type { PublicAppConfig, StartupScanStatus } from "../types.js";
import type { SessionSource, SourceScanResult } from "../view-model.js";
import { sourceLabels } from "./source-labels.js";
import { Button, Card, Field, Input, SectionTitle, StatusCallout } from "./ui.js";

export function SettingsWorkspace({ settings, startup, onSaved }: { settings: PublicAppConfig; startup: StartupScanStatus | null; onSaved: (message?: string) => Promise<void> }) {
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
      await onSaved(await scanChangedSources(changedSources));
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
          <SectionTitle>Settings</SectionTitle>
        </div>
        <div className="mt-4 space-y-6">
          <section>
            <h2 className="text-base font-semibold">Sources</h2>
            <p className="mt-1 text-sm text-neutral-600">Choose where AI-Todo scans local agent sessions.</p>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <Field label="Codex source">
                <Input value={form.sources.codex.path ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sources: { ...form.sources, codex: { path: event.target.value } } })} />
              </Field>
              <Field label="Claude source">
                <Input value={form.sources["claude-code"].path ?? ""} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, sources: { ...form.sources, "claude-code": { path: event.target.value } } })} />
              </Field>
            </div>
          </section>
          <section>
            <h2 className="text-base font-semibold">Extraction</h2>
            <p className="mt-1 text-sm text-neutral-600">Control how many recent sessions are organized into cards.</p>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <Field label="Look-back days">
                <Input type="number" min={1} value={form.organize.sinceDays} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, organize: { ...form.organize, sinceDays: Number(event.target.value) } })} />
              </Field>
              <Field label="Max sessions">
                <Input type="number" min={1} max={200} value={form.organize.maxSessions} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, organize: { ...form.organize, maxSessions: Number(event.target.value) } })} />
              </Field>
              <Field label="API key">
                <Input type="password" placeholder={settings.llm.apiKeyConfigured ? `Configured ${settings.llm.apiKeyMasked}` : "Paste API key"} value={apiKey} onChange={(event: ChangeEvent<HTMLInputElement>) => setApiKey(event.target.value)} />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={clearKey} onChange={(event) => setClearKey(event.target.checked)} />
              Clear saved API key
            </label>
          </section>
        </div>
        <Button className="mt-4" onClick={() => void save()} disabled={saving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Settings
        </Button>
        {saveError && <StatusCallout tone="danger" className="mt-3">{saveError}</StatusCallout>}
      </Card>
      <details className="rounded-lg border border-neutral-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
          Advanced diagnostics
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </summary>
        <div className="mt-3 grid gap-4 text-sm text-neutral-600 md:grid-cols-2">
          <Field label="Model">
            <Input value={form.llm.model} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, llm: { ...form.llm, model: event.target.value } })} />
          </Field>
          <Field label="Endpoint">
            <Input value={form.llm.endpoint} onChange={(event: ChangeEvent<HTMLInputElement>) => setForm({ ...form, llm: { ...form.llm, endpoint: event.target.value } })} />
          </Field>
          <p>Startup scan: {startup?.status ?? "idle"}</p>
          <p>Extraction: {settings.llm.apiKeyConfigured ? "Configured" : "Needs setup"}</p>
          {startup?.warnings.map((warning: string) => <p key={warning}>{userFacingError(warning)}</p>)}
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

async function scanChangedSources(sources: SessionSource[]): Promise<string | undefined> {
  if (sources.length === 0) return undefined;
  const failures: string[] = [];
  for (const source of sources) {
    try {
      const result = await api<SourceScanResult>("/sources/scan", { method: "POST", body: { source } });
      if (result.warning) failures.push(`${sourceLabels[source]}: ${userFacingError(result.warning)}`);
    } catch (error) {
      failures.push(`${sourceLabels[source]}: ${(error as Error).message}`);
    }
  }
  if (failures.length > 0) return `Source scan failed: ${failures.join(" ")}`;
  return "Source scan finished.";
}
