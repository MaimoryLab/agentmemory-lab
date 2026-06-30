import type { OrganizeResult, SourceKind, StartupScanStatus, TodoCard } from "../types.js";

export type Locale = "zh-CN" | "en-US";
export type SourceFilter = SourceKind | "all";
export type SessionSource = Extract<SourceKind, "codex" | "claude-code">;

export const DEFAULT_LOCALE: Locale = "zh-CN";

export const sourceLabels: Record<Locale, Record<SourceKind, string>> = {
  "zh-CN": {
    codex: "Codex",
    "claude-code": "Claude Code",
    browser: "浏览器"
  },
  "en-US": {
    codex: "Codex",
    "claude-code": "Claude Code",
    browser: "Browser"
  }
};

type MessageValue = string | ((...args: any[]) => string);

export const messages = {
  "zh-CN": {
    appName: "AI Todo",
    pageTitle: "行动收件箱",
    pageSubtitle: "集中查看近期 AI 会话中的任务意图、Agent 进展和来源链路。",
    refresh: "刷新",
    organize: "整理",
    organizing: "正在整理近期会话...",
    navTodos: "待办",
    navSources: "来源",
    navSettings: "设置",
    status: "状态",
    review: "复盘",
    open: "打开",
    done: "完成",
    ignored: "已忽略",
    sources: "来源",
    source: "来源",
    complete: "完成",
    ignore: "忽略",
    cards: "卡片",
    noCardsTitle: "还没有卡片",
    noCardsBody: "整理近期会话，生成一个聚焦的行动收件箱。",
    todoSection: "待办",
    openLoopsTitle: "先处理未闭环事项",
    openLoopsBody: "按 Agent 进展分组，优先复盘风险最高的工作。",
    blocked: "阻塞",
    blockedDescription: "需要决策、凭据或缺失来源。",
    inProgress: "进行中",
    inProgressDescription: "Agent 已开始处理，需要复盘变更。",
    needsReview: "待复盘",
    needsReviewDescription: "等待人工确认或继续跟进。",
    completedIgnored: "已完成 / 已忽略",
    agent: "Agent",
    sourceUnavailable: "来源不可用",
    temporarySession: "临时会话",
    searchSources: "搜索来源",
    sourceFilter: "来源筛选",
    all: "全部",
    sessions: "会话",
    messages: "消息",
    connectSource: "连接或扫描来源后查看会话。",
    noSessionMatches: "没有匹配的会话。",
    selectSource: "选择一个来源来加载对话。",
    noSourceSessions: "还没有来源会话。",
    showMore: (count: number) => `再显示 ${count} 个`,
    showMoreSessions: (count: number) => `再显示 ${count} 个会话`,
    loadMore: "加载更多",
    showAllMessages: "显示全部消息",
    message: "消息",
    settingsTitle: "设置",
    language: "界面语言",
    languageDescription: "只影响浏览器界面，不改变 CLI、MCP 或 API 错误码。",
    chinese: "中文",
    english: "English",
    sourcesSettingsTitle: "来源",
    sourcesSettingsBody: "选择 AI-Todo 扫描本地 Agent 会话的位置。",
    codexSource: "Codex 来源",
    claudeSource: "Claude 来源",
    extractionTitle: "抽取",
    extractionBody: "控制最近多少会话会被整理成卡片。",
    lookbackDays: "回看天数",
    maxSessions: "最多会话",
    apiKey: "API key",
    apiKeyConfigured: (masked: string) => `已配置 ${masked}`,
    pasteApiKey: "粘贴 API key",
    clearApiKey: "清除已保存 API key",
    saveSettings: "保存设置",
    settingsSaved: "设置已保存。",
    advancedDiagnostics: "高级诊断",
    model: "模型",
    endpoint: "Endpoint",
    startupScan: "启动扫描",
    extraction: "抽取",
    configured: "已配置",
    needsSetup: "需要设置",
    discovery: "路径发现",
    discoveryConfigured: "用户已配置",
    discoveryDiscovered: "已自动发现",
    discoveryMissing: "未找到",
    operationalStrip: "运行状态条",
    sourceScanFinished: "来源扫描完成。",
    sourceScanFailed: (message: string) => `来源扫描失败：${message}`,
    organizedSummary: (created: number, updated: number) => `已整理 ${created} 张新卡片，更新 ${updated} 张卡片。`,
    organizeWarning: (warnings: string) => `部分会话需要复盘：${warnings}`,
    openSourceSession: (title: string) => `打开 ${title} 的来源会话`,
    openSourcesFor: (title: string) => `打开 ${title} 的来源`,
    completeTodo: (title: string) => `完成 ${title}`,
    ignoreTodo: (title: string) => `忽略 ${title}`,
    sourceNotLinked: "这张卡片还没有关联来源。",
    linkedSessionMissing: "关联的来源会话已不可用。",
    startupScanFailedPrefix: "来源扫描失败："
  },
  "en-US": {
    appName: "AI Todo",
    pageTitle: "Action inbox",
    pageSubtitle: "Review task intent, agent progress, and source trails from recent AI sessions.",
    refresh: "Refresh",
    organize: "Organize",
    organizing: "Organizing recent sessions...",
    navTodos: "To-Do",
    navSources: "Sources",
    navSettings: "Settings",
    status: "Status",
    review: "Review",
    open: "Open",
    done: "Done",
    ignored: "Ignored",
    sources: "Sources",
    source: "Source",
    complete: "Complete",
    ignore: "Ignore",
    cards: "Cards",
    noCardsTitle: "No cards yet",
    noCardsBody: "Organize recent sessions into a focused action inbox.",
    todoSection: "To-Do",
    openLoopsTitle: "Open loops first",
    openLoopsBody: "Grouped by agent progress so the next review pass starts with the riskiest work.",
    blocked: "Blocked",
    blockedDescription: "Needs a decision, credential, or missing source.",
    inProgress: "In progress",
    inProgressDescription: "Agent has started work; review what changed.",
    needsReview: "Needs review",
    needsReviewDescription: "Ready for human triage or follow-up.",
    completedIgnored: "Completed / ignored",
    agent: "Agent",
    sourceUnavailable: "Source unavailable",
    temporarySession: "Temporary session",
    searchSources: "Search sources",
    sourceFilter: "Source filter",
    all: "All",
    sessions: "sessions",
    messages: "messages",
    connectSource: "Connect or scan a source to review sessions.",
    noSessionMatches: "No sessions match this search.",
    selectSource: "Select a source to load its conversation.",
    noSourceSessions: "No source sessions yet.",
    showMore: (count: number) => `Show ${count} more`,
    showMoreSessions: (count: number) => `Show ${count} more sessions`,
    loadMore: "Load more",
    showAllMessages: "Show all messages",
    message: "Message",
    settingsTitle: "Settings",
    language: "Interface language",
    languageDescription: "Only changes the browser UI; CLI, MCP, and API error codes stay stable.",
    chinese: "中文",
    english: "English",
    sourcesSettingsTitle: "Sources",
    sourcesSettingsBody: "Choose where AI-Todo scans local agent sessions.",
    codexSource: "Codex source",
    claudeSource: "Claude source",
    extractionTitle: "Extraction",
    extractionBody: "Control how many recent sessions are organized into cards.",
    lookbackDays: "Look-back days",
    maxSessions: "Max sessions",
    apiKey: "API key",
    apiKeyConfigured: (masked: string) => `Configured ${masked}`,
    pasteApiKey: "Paste API key",
    clearApiKey: "Clear saved API key",
    saveSettings: "Save settings",
    settingsSaved: "Settings saved.",
    advancedDiagnostics: "Advanced diagnostics",
    model: "Model",
    endpoint: "Endpoint",
    startupScan: "Startup scan",
    extraction: "Extraction",
    configured: "Configured",
    needsSetup: "Needs setup",
    discovery: "Path discovery",
    discoveryConfigured: "User configured",
    discoveryDiscovered: "Auto-discovered",
    discoveryMissing: "Not found",
    operationalStrip: "Run status strip",
    sourceScanFinished: "Source scan finished.",
    sourceScanFailed: (message: string) => `Source scan failed: ${message}`,
    organizedSummary: (created: number, updated: number) => `Organized ${created} new and ${updated} updated cards.`,
    organizeWarning: (warnings: string) => `Some sessions need review: ${warnings}`,
    openSourceSession: (title: string) => `Open source session for ${title}`,
    openSourcesFor: (title: string) => `Open sources for ${title}`,
    completeTodo: (title: string) => `Complete ${title}`,
    ignoreTodo: (title: string) => `Ignore ${title}`,
    sourceNotLinked: "No source is linked to this card yet.",
    linkedSessionMissing: "The linked source session is no longer available.",
    startupScanFailedPrefix: "Source scan failed: "
  }
} satisfies Record<Locale, Record<string, MessageValue>>;

export type Messages = typeof messages[Locale];

const errors: Record<Locale, Record<string, string>> = {
  "zh-CN": {
    llm_config_missing: "抽取需要先完成设置。",
    llm_no_valid_candidates: "部分会话中没有找到可行动卡片。",
    llm_output_invalid: "抽取服务返回了不可用结果。",
    llm_batch_failed: "部分会话未能处理。",
    llm_timeout: "抽取超时。",
    llm_provider_failed: "抽取服务未能完成。",
    llm_input_truncated: "部分会话文本已为抽取而缩短。",
    organize_scope_truncated: "当前限制排除了一些较旧会话。",
    path_not_found: "来源路径需要设置。",
    codex_path_not_found: "未找到 Codex 来源路径。",
    "claude-code_path_not_found": "未找到 Claude 来源路径。",
    codex_no_sessions: "来源路径中没有找到 Codex 会话。",
    "claude-code_no_sessions": "来源路径中没有找到 Claude 会话。",
    config_invalid: "设置需要检查。",
    database_unavailable: "本地数据库不可用。",
    organize_failed: "整理失败，请查看诊断。"
  },
  "en-US": {
    llm_config_missing: "Extraction needs setup.",
    llm_no_valid_candidates: "No actionable cards found in some sessions.",
    llm_output_invalid: "Extractor returned an unusable response.",
    llm_batch_failed: "Some sessions could not be processed.",
    llm_timeout: "Extraction timed out.",
    llm_provider_failed: "Extraction service could not finish.",
    llm_input_truncated: "Some session text was shortened for extraction.",
    organize_scope_truncated: "Some older sessions were left out by current limits.",
    path_not_found: "Source path needs setup.",
    codex_path_not_found: "Codex source path was not found.",
    "claude-code_path_not_found": "Claude source path was not found.",
    codex_no_sessions: "No Codex sessions were found in the source path.",
    "claude-code_no_sessions": "No Claude sessions were found in the source path.",
    config_invalid: "Settings need review.",
    database_unavailable: "Local database is unavailable.",
    organize_failed: "Organize failed. Open diagnostics for details."
  }
};

export function normalizeLocale(value: string | null | undefined): Locale {
  return value === "en-US" ? "en-US" : DEFAULT_LOCALE;
}

export function errorText(error: string, locale: Locale): string {
  return errors[locale][error] ?? error.replace(/_/g, " ");
}

export function sourceLabel(source: SourceKind, locale: Locale): string {
  return sourceLabels[locale][source];
}

export function todoStatusLabel(todo: TodoCard, locale: Locale): string {
  if (todo.status === "todo") return messages[locale].open as string;
  if (todo.status === "done") return messages[locale].done as string;
  return messages[locale].ignored as string;
}

export function organizeStatus(result: OrganizeResult, locale: Locale): string {
  const t = messages[locale];
  const summary = (t.organizedSummary as (created: number, updated: number) => string)(result.created, result.updated);
  if (result.warnings.length === 0) return summary;
  const warnings = result.warnings.map((warning) => errorText(warning, locale)).join(" ");
  if (result.created + result.updated > 0) return `${summary} ${(t.organizeWarning as (warnings: string) => string)(warnings)}`;
  return `${summary} ${warnings}`;
}

export function startupStatusMessage(startup: StartupScanStatus | null, locale: Locale): string {
  if (!startup?.warnings.length) return "";
  return `${messages[locale].startupScanFailedPrefix}${startup.warnings.map((warning) => errorText(warning, locale)).join(" ")}`;
}
