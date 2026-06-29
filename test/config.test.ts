import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { getAppPaths } from "../src/paths.js";
import { loadConfig, saveConfig } from "../src/config.js";
import { resolveSourcePath } from "../src/sources/scan.js";

test("config reads defaults and persists source paths", () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-config-"));
  try {
    const paths = getAppPaths(dir);
    assert.deepEqual(loadConfig(paths), {
      sources: {
        codex: {},
        "claude-code": {}
      }
    });

    const config = {
      sources: {
        codex: { path: join(dir, "codex") },
        "claude-code": { path: join(dir, "claude") }
      }
    };
    saveConfig(paths, config);
    assert.deepEqual(loadConfig(paths), config);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("config rejects invalid files and preserves source path precedence", () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-config-invalid-"));
  const previousCodex = process.env.AI_TODO_CODEX_HOME;
  delete process.env.AI_TODO_CODEX_HOME;

  try {
    const paths = getAppPaths(dir);
    mkdirSync(paths.configDir, { recursive: true });
    writeFileSync(paths.configPath, "{");
    assert.throws(() => loadConfig(paths), /config_invalid/);

    const explicit = join(dir, "explicit");
    const env = join(dir, "env");
    const configPath = join(dir, "config-codex");
    saveConfig(paths, { sources: { codex: { path: configPath }, "claude-code": {} } });
    assert.equal(resolveSourcePath("codex", explicit, paths), explicit);
    process.env.AI_TODO_CODEX_HOME = env;
    assert.equal(resolveSourcePath("codex", undefined, paths), env);
    delete process.env.AI_TODO_CODEX_HOME;
    assert.equal(resolveSourcePath("codex", undefined, paths), configPath);
  } finally {
    if (previousCodex === undefined) {
      delete process.env.AI_TODO_CODEX_HOME;
    } else {
      process.env.AI_TODO_CODEX_HOME = previousCodex;
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
