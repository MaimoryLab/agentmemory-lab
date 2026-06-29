import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("LangExtract sidecar self-test covers defaults and prompt examples", () => {
  const result = spawnSync("python3", ["src/extract/todo-extract-langextract.py"], {
    env: { ...process.env, AI_TODO_LLM_SELF_TEST: "1" },
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
