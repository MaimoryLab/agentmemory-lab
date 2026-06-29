import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openDatabase } from "../src/db/index.js";
import { getAppPaths } from "../src/paths.js";
import { createAppServer } from "../src/server/index.js";
import { ingestBrowserSession } from "../src/sources/browser.js";
import { listTodos, organizeTodos } from "../src/todos/service.js";

test("rules-only organize creates evidence-backed todo cards without duplicates", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-organize-"));
  try {
    const db = openDatabase(getAppPaths(dir));
    ingestBrowserSession(db, {
      id: "browser-1",
      messages: [
        { role: "user", text: "Please add a CLI doctor command" },
        { role: "assistant", text: "Implemented the doctor command" }
      ]
    });

    const first = await organizeTodos(db);
    assert.equal(first.engine, "rules");
    assert.deepEqual(first.warnings, ["llm_enhancer_unavailable"]);
    assert.equal(first.scanned, 2);
    assert.equal(first.created, 1);
    assert.equal(first.updated, 0);
    assert.equal(first.sources[0]?.source, "browser");

    const second = await organizeTodos(db);
    assert.equal(second.created, 0);
    assert.equal(second.updated, 1);

    const todos = listTodos(db);
    db.close();
    assert.equal(todos.length, 1);
    assert.equal(todos[0].title, "Add a CLI doctor command");
    assert.equal(todos[0].status, "todo");
    assert.equal(todos[0].evidenceIds.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("optional enhancer can improve card title and description", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-organize-enhance-"));
  try {
    const db = openDatabase(getAppPaths(dir));
    ingestBrowserSession(db, {
      id: "browser-1",
      messages: [{ role: "user", text: "Please add api route docs because users need examples" }]
    });

    const result = await organizeTodos(db, {
      enhancer: async (candidate) => ({
        title: "Add API route examples",
        description: `Enhanced: ${candidate.description}`
      })
    });
    const todos = listTodos(db);
    db.close();

    assert.equal(result.engine, "rules+llm");
    assert.deepEqual(result.warnings, []);
    assert.equal(todos[0].title, "Add API route examples");
    assert.equal(todos[0].description, "Enhanced: Please add api route docs because users need examples");
    assert.equal(todos[0].evidenceIds.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("optional enhancer failure falls back to rules card with warning", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-organize-enhance-fallback-"));
  try {
    const db = openDatabase(getAppPaths(dir));
    ingestBrowserSession(db, {
      id: "browser-1",
      messages: [{ role: "user", text: "Please add API route docs" }]
    });

    const result = await organizeTodos(db, {
      enhancer: async () => {
        throw new Error("provider unavailable");
      }
    });
    const todos = listTodos(db);
    db.close();

    assert.equal(result.engine, "rules");
    assert.deepEqual(result.warnings, ["llm_enhancer_failed"]);
    assert.equal(todos[0].title, "Add API route docs");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("invalid enhancer output falls back to rules card with warning", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-organize-enhance-invalid-"));
  try {
    const db = openDatabase(getAppPaths(dir));
    ingestBrowserSession(db, {
      id: "browser-1",
      messages: [{ role: "user", text: "Please add API route docs" }]
    });

    const result = await organizeTodos(db, {
      enhancer: async () => ({ title: "", description: "ignored" })
    });
    const todos = listTodos(db);
    db.close();

    assert.equal(result.engine, "rules");
    assert.deepEqual(result.warnings, ["llm_enhancer_invalid"]);
    assert.equal(todos[0].title, "Add API route docs");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("organize endpoint returns OrganizeResult", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-organize-http-"));
  const db = openDatabase(getAppPaths(dir));
  ingestBrowserSession(db, {
    id: "browser-1",
    messages: [{ role: "user", text: "Need update settings persistence" }]
  });
  const server = createAppServer({ db });

  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/todos/organize`, { method: "POST" });
    const result = await response.json();
    assert.equal(response.status, 200);
    assert.equal(result.engine, "rules");
    assert.equal(result.created, 1);
    assert.equal(result.ignored, 0);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("rules-only organize merges duplicate todo wording", async () => {
  const dir = mkdtempSync(join(tmpdir(), "ai-todo-organize-merge-"));
  try {
    const db = openDatabase(getAppPaths(dir));
    ingestBrowserSession(db, {
      id: "browser-1",
      messages: [
        { role: "user", text: "Please add CLI list output" },
        { role: "user", text: "Need to add cli list output." },
        { role: "user", text: "Please take a look when you have time." }
      ]
    });

    const result = await organizeTodos(db);
    const todos = listTodos(db);
    db.close();

    assert.equal(result.created, 1);
    assert.equal(todos.length, 1);
    assert.equal(todos[0].title, "Add CLI list output");
    assert.equal(todos[0].evidenceIds.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
