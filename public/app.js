const state = {
  sources: [],
  sessions: [],
  todos: [],
  settings: null
};

const $ = (selector) => document.querySelector(selector);

document.querySelectorAll(".tabs button").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.view));
});

$("#scan-codex").addEventListener("click", () => scan("codex"));
$("#scan-claude").addEventListener("click", () => scan("claude-code"));
$("#organize").addEventListener("click", organize);
$("#settings-form").addEventListener("submit", saveSettings);

await refresh();

async function refresh() {
  try {
    const [sources, sessions, todos, settings] = await Promise.all([
      api("/sources"),
      api("/sessions"),
      api("/todos"),
      api("/settings")
    ]);
    Object.assign(state, { sources, sessions, todos, settings });
    render();
    setStatus("Ready");
  } catch (error) {
    setStatus(error.message);
  }
}

function render() {
  renderSources();
  renderSessions();
  renderTodos();
  renderSettings();
}

function renderSources() {
  $("#source-grid").innerHTML = state.sources.map((source) => `
    <article class="stat">
      <div class="label">${escapeHtml(source.source)}</div>
      <div class="value">${source.sessions}</div>
      <div class="meta">${source.checkpoints} checkpoints</div>
    </article>
  `).join("");
}

function renderSessions() {
  $("#sessions").innerHTML = state.sessions.length ? state.sessions.map((session) => `
    <article class="row">
      <div class="row-head">
        <div class="title">${escapeHtml(session.source)}</div>
        <div class="meta">${formatDate(session.updatedAt)}</div>
      </div>
      <div class="meta">${escapeHtml(session.path)}</div>
    </article>
  `).join("") : `<div class="empty">No sessions scanned yet.</div>`;
}

function renderTodos() {
  $("#todo-list").innerHTML = state.todos.length ? state.todos.map((todo) => `
    <article class="row">
      <div class="row-head">
        <div class="title">${escapeHtml(todo.title)}</div>
        <div class="meta">${formatDate(todo.updatedAt)}</div>
      </div>
      <div class="desc">${escapeHtml(todo.description)}</div>
      <div class="badges">
        <span class="badge ${todo.status}">${todo.status}</span>
        <span class="badge">${todo.evidenceIds.length} evidence</span>
      </div>
      <div class="row-actions">
        <button type="button" data-evidence="${escapeHtml(todo.id)}">Evidence</button>
        <button type="button" data-status="done" data-id="${escapeHtml(todo.id)}">Done</button>
        <button type="button" data-status="ignored" data-id="${escapeHtml(todo.id)}">Ignore</button>
      </div>
    </article>
  `).join("") : `<div class="empty">No todos. Scan sources, then organize.</div>`;

  document.querySelectorAll("[data-status]").forEach((button) => {
    button.addEventListener("click", () => updateTodo(button.dataset.id, button.dataset.status));
  });
  document.querySelectorAll("[data-evidence]").forEach((button) => {
    button.addEventListener("click", () => loadEvidence(button.dataset.evidence));
  });
}

function renderSettings() {
  $("#codex-path").value = state.settings?.sources?.codex?.path ?? "";
  $("#claude-path").value = state.settings?.sources?.["claude-code"]?.path ?? "";
}

async function scan(source) {
  setStatus(`Scanning ${source}...`);
  await api("/sources/scan", { method: "POST", body: { source } });
  await refresh();
}

async function organize() {
  setStatus("Organizing todos...");
  const result = await api("/todos/organize", { method: "POST", body: {} });
  showOrganizeResult(result);
  await refresh();
}

async function updateTodo(id, status) {
  await api(`/todos/${encodeURIComponent(id)}`, { method: "PATCH", body: { status } });
  await refresh();
}

async function loadEvidence(id) {
  const evidence = await api(`/todos/${encodeURIComponent(id)}/evidence`);
  $("#evidence-list").innerHTML = evidence.length ? evidence.map((item) => `
    <article class="row">
      <div class="meta">${escapeHtml(item.observationId)}</div>
      <div class="desc">${escapeHtml(item.text)}</div>
    </article>
  `).join("") : `<div class="empty">No evidence for this todo.</div>`;
  showView("evidence");
}

async function saveSettings(event) {
  event.preventDefault();
  await api("/settings", {
    method: "PUT",
    body: {
      sources: {
        codex: pathValue("#codex-path"),
        "claude-code": pathValue("#claude-path")
      }
    }
  });
  await refresh();
}

function pathValue(selector) {
  const path = $(selector).value.trim();
  return path ? { path } : {};
}

function showOrganizeResult(result) {
  $("#organize-result").innerHTML = [
    ["Scanned", result.scanned],
    ["Created", result.created],
    ["Updated", result.updated],
    ["Completed", result.completed],
    ["Ignored", result.ignored],
    ["Engine", result.engine],
    ["Warnings", result.warnings.join(", ") || "none"],
    ["Duration", `${result.durationMs}ms`]
  ].map(([label, value]) => `
    <div class="stat">
      <div class="label">${label}</div>
      <div class="value">${escapeHtml(String(value))}</div>
    </div>
  `).join("");
  $("#organize-dialog").showModal();
}

function showView(id) {
  document.querySelectorAll(".tabs button").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === id);
  });
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("active", view.id === id);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`);
  return body;
}

function setStatus(message) {
  $("#status").textContent = message;
}

function formatDate(value) {
  return new Date(value).toLocaleString();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}
