import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { defaultConfig } from "../src/config.js";
import { createLangExtractRunner, getDefaultLangExtractSidecarPath } from "../src/extract/langextract-runner.js";

const observation = {
  id: "obs-1",
  sessionId: "session-1",
  source: "browser" as const,
  role: "user",
  text: "Please add LLM settings UI",
  createdAt: "2026-01-01T00:00:00.000Z"
};

test("LangExtract runner reports missing api key before spawning", async () => {
  const runner = createLangExtractRunner(defaultConfig().llm, {});
  assert.deepEqual(await runner([observation]), { ok: false, warning: "llm_config_missing" });
});

test("LangExtract runner resolves the source-tree sidecar after build", () => {
  assert.match(getDefaultLangExtractSidecarPath(), /todo-extract-langextract\.py$/);
});

test("LangExtract runner parses grounded sidecar todos", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-llm-runner-"));
  try {
    const sidecar = join(dir, "mock-sidecar.mjs");
    writeFileSync(sidecar, [
      "#!/usr/bin/env node",
      "let input='';",
      "process.stdin.on('data', c => input += c);",
      "process.stdin.on('end', () => {",
      "  const payload = JSON.parse(input);",
      "  const block = payload.blocks[0];",
      "  console.log(JSON.stringify({ todos: [{",
      "    title: 'Add LLM settings UI',",
      "    description: 'Add settings controls for the LLM provider.',",
      "    confidence: 0.91,",
      "    sourceObservationId: block.sourceObservationId,",
      "    quote: 'Please add LLM settings UI',",
      "    dedupeKey: 'add-llm-settings-ui'",
      "  }] }));",
      "});"
    ].join("\n"));

    const runner = createLangExtractRunner(
      { ...defaultConfig().llm, pythonPath: process.execPath },
      { llmApiKey: "dummy-llm-key-value" },
      sidecar
    );
    const result = await runner([observation]);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.todos[0].sourceObservationId, "obs-1");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("LangExtract runner maps bad sidecar output to invalid warning", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-llm-runner-bad-"));
  try {
    const sidecar = join(dir, "bad-sidecar.mjs");
    writeFileSync(sidecar, "console.log('not json');\n");
    const runner = createLangExtractRunner(
      { ...defaultConfig().llm, pythonPath: process.execPath },
      { llmApiKey: "dummy-llm-key-value" },
      sidecar
    );
    assert.deepEqual(await runner([observation]), { ok: false, warning: "llm_output_invalid" });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
