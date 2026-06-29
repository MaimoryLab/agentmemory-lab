import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { AppPaths } from "./paths.js";

export interface AppConfig {
  sources: {
    codex: { path?: string };
    "claude-code": { path?: string };
  };
}

export function defaultConfig(): AppConfig {
  return {
    sources: {
      codex: {},
      "claude-code": {}
    }
  };
}

export function loadConfig(paths: AppPaths): AppConfig {
  if (!existsSync(paths.configPath)) return defaultConfig();
  try {
    return parseConfig(JSON.parse(readFileSync(paths.configPath, "utf8")));
  } catch (error) {
    if ((error as Error).message === "config_invalid") throw error;
    throw new Error("config_invalid");
  }
}

export function saveConfig(paths: AppPaths, config: AppConfig): void {
  mkdirSync(paths.configDir, { recursive: true });
  writeFileSync(paths.configPath, `${JSON.stringify(parseConfig(config), null, 2)}\n`);
}

export function parseConfig(input: unknown): AppConfig {
  const record = objectValue(input);
  if (!record) throw new Error("config_invalid");
  const sources = objectValue(record?.sources);
  if (!sources) throw new Error("config_invalid");
  const keys = Object.keys(sources);
  if (keys.some((key) => key !== "codex" && key !== "claude-code")) throw new Error("config_invalid");
  return {
    sources: {
      codex: sourceConfig(sources.codex),
      "claude-code": sourceConfig(sources["claude-code"])
    }
  };
}

export function normalizeConfig(input: unknown): AppConfig {
  try {
    return parseConfig(input);
  } catch {
    return defaultConfig();
  }
}

function sourceConfig(value: unknown): { path?: string } {
  const input = objectValue(value);
  if (!input) throw new Error("config_invalid");
  const keys = Object.keys(input);
  if (keys.some((key) => key !== "path")) throw new Error("config_invalid");
  const path = input?.path;
  if (path === undefined) return {};
  if (typeof path !== "string" || !path.trim()) throw new Error("config_invalid");
  return { path: path.trim() };
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}
