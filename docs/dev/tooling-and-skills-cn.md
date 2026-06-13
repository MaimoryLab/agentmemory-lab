# 开发提效工具与 Skill 整理（MCP / Skill / 自动化）

> 面向 agentmemory-lab 当前开发现状（单文件 viewer、AGENTS.md 一致性铁律、CI 4 格全量、preview 浏览器实证）整理。目的:把**已验证有用**的工具固化进工作流，并标出**值得吸纳**的新能力。区分「现在就能用」与「需配置/评估」。

## 0. 一句话结论

当前最大提效杠杆不是引入新框架，而是:**①把分散的 `check:*` 验证收敛成一条 pre-PR 命令；②把一致性铁律做成开工前自检；③固化 preview 实证为 UI 改动的默认验收**。下面分三类整理。

---

## 1. 已在用、应固化的能力

这些本轮重构已反复使用并验证有效，应写进默认流程（不是「可选」）。

| 能力 | 用途 | 现状 | 固化建议 |
|---|---|---|---|
| **Claude Preview MCP**（`preview_start/eval/inspect/screenshot/snapshot`） | viewer 改动的浏览器实证:验证渲染、XSS 转义、跳转高亮、专家模式 tab | 已用且已固化:`scripts/viewer-preview-proxy.cjs` + `.claude/launch.json` 的 `viewer-proxy` 目标 | 见 §4「preview 实证配方」 |
| **Explore 子代理** | 大范围代码地图(本规划的工作流梳理即由其产出) | 已用 | 任何「跨多文件摸清现状」先派 Explore，省主上下文 |
| **gh CLI** | 开 PR / 查 CI / 合并 | 已用 | 已是默认 |
| **逐步 STEP 文档 + 看板** | 一步一 PR、预测后回填 | 已用，docs/issues/ | 见 [[agentmemory-restructure-workflow]] 记忆 |

---

## 2. 值得吸纳的 Skill（按优先级）

会话内可用的 skill 里，与本项目开发强相关的:

### 高价值（建议常用）
- **`/code-review`** — 审当前 diff 的正确性 bug 与可简化项。**建议:每个代码 STEP 推 PR 前先跑一次**（low/medium effort 即可），尤其碰 `src/viewer/index.html` 这种 9000+ 行单文件、易引入隐藏回归的地方。可 `--comment` 直接发 PR 行评论。
- **`/verify`** — 跑起来、观察行为确认改动生效。与 preview 实证互补:verify 偏「端到端跑通」，preview 偏「逐元素查」。**建议:STEP-03 跳转、STEP-05 专家模式这类交互改动用 verify 收尾**。
- **`/simplify`** — 只做复用/简化/效率清理（不找 bug）。**建议:viewer 里反复出现的 `html += '<div...'` 模式、STEP-01 砍导航后的死代码，定期跑一次**。

### 中价值（按需）
- **`/claude-api`** — 当未来要给「待回应」「已完成识别」接 LLM 时（design-lock D 节两个缺口），查 Claude 模型 id/定价/tool-use/缓存的权威参考，不要凭记忆。
- **`/deep-research`** — 评估「引入某 MD 库 vs 手写」「飞书机器人投递方案」等需要多源核实的决策时用。
- **`anthropic-skills:consolidate-memory`** — 定期(如每完成一条产品线)对 memory 做反思式合并，剪枝过时项。本规划的 Part 2 即手动做了一次（删了已失效的 pre-existing-failures）。

### 流程类
- **`/fewer-permission-prompts`** — 扫描常用只读 Bash/MCP 调用，写进项目 `.claude/settings.json` 允许列表，减少重构期反复的权限弹窗。**建议尽早做一次**（npm test/build、gh pr、curl localhost 都是高频只读）。
- **`/loop`** — 轮询型任务（如盯 CI、批量验证多视图）。本轮盯 4 格 CI 可用。

---

## 3. 值得吸纳的 MCP / 自动化（需配置或评估）

### 3.1 把本项目自己的 MCP 接进来（dogfooding）
agentmemory-lab **本身就是个 MCP 服务器**（`src/mcp/`，51 工具，`plugin/.mcp.json` 注册 `npx @agentmemory/mcp`）。开发它的同时把它接给开发用的 Claude，能:
- 让记忆/会话历史在开发会话间留存（recall/remember/recap/handoff 等 12 个 plugin skill）。
- 真实 dogfood「待办/证据」链路——开发者自己就是「个人重度 Agent 用户」。
- **评估点**:需起本地 worker(`:3111`)+ 配 `AGENTMEMORY_URL`；注意别让开发数据污染 demo。建议用独立数据目录。

### 3.2 一致性铁律自检（强烈建议做成脚本/hook）
碰 MCP 工具/REST 端点/版本号要同步改 8/3/7 处（见 [[agentmemory-consistency-rules]]），现在靠 `test/consistency.test.ts` 在 CI 兜底——**但那是事后兜底，4 格跑完才知道红**。建议:
- 加一个 `scripts/check-consistency-local.mjs`（或复用 consistency.test 的逻辑）做**开工前/推前自检**，本地秒级反馈，不必等 CI。
- 或做成 PreToolUse hook:当 Edit 命中 `tools-registry.ts`/`api.ts`/`version.ts` 时，提示「记得同步另外 N 处」。

### 3.3 pre-PR 聚合命令（最高性价比）
当前**没有**单条 pre-PR 命令（CONTRIBUTING 只列 install/build/test）。`check:*` 有 20+ 个但不在 CI 跑、也不在贡献者默认流程。建议加:
```jsonc
// package.json scripts
"pre-pr": "npm run build && npm test"          // 最小，对齐 CI
"pre-pr:full": "npm run build && npm test && npm run check:workbench"  // 带运行时
```
让「推前必跑」从口头约定变成一条命令。

---

## 4. preview 实证配方（固化 viewer 验收）

本轮 viewer 验证的痛点:viewer 有 host 白名单(DNS-rebinding 防护,`src/viewer/server.ts:1068` 非 loopback Host 返回 "forbidden host"),preview 直连被拒。已固化解决:

1. ✅ **代理脚本入仓**:`scripts/viewer-preview-proxy.cjs`——转发到 viewer(默认 `:3114`)时把 Host 头重写为 `localhost:<端口>` 绕过白名单。端口可经 `VIEWER_PROXY_PORT`/`AGENTMEMORY_VIEWER_PORT` 覆盖;上游不可达时给友好 502 提示。
2. ✅ **launch.json 配两个目标**(`.claude/launch.json` —— 注意 `.claude/` 是 gitignored 的**本地**配置,不入仓;入仓的是脚本):`viewer-proxy`(`:3198`→`:3114`,带 live worker 的实证)与 `viewer-static`(`:3199` 静态 `dist/viewer`,纯前端形态)。`preview_start` 直接拉起,不必每次手搭。配置样例:
   ```jsonc
   { "name": "viewer-proxy", "runtimeExecutable": "node",
     "runtimeArgs": ["scripts/viewer-preview-proxy.cjs"], "port": 3198 }
   ```
3. **实证清单**（UI 改动默认走）:`preview_eval` 调被测函数验逻辑 → `preview_inspect` 查元素/CSS → `preview_screenshot` 留证 → `preview_console_logs level=error` 确认无运行时错。
4. **注意**:demo 数据被证据栏 `isDemoSession` 过滤,端到端跳转类验证需真实(非 demo)数据,这点要在验收清单里写明。

---

## 5. 不建议引入的（避免过度工程）

- **前端构建工具链（Vite/打包器）**:viewer 是 CSP-nonce 锁死的单文件、`document.ts` 按请求读盘下发，刷新即生效。引打包器会破坏这个零构建的快反馈，且与 nonce-CSP 冲突。STEP-04 已论证手写安全子集优于内联 50KB 库。
- **重型 E2E 框架（Playwright 全家桶）**:当前 vitest + vm 沙箱跑 viewer 函数 + preview MCP 实证已覆盖。除非要做跨浏览器矩阵，否则不值当。

---

## 6. 行动清单（建议落地顺序）

1. `/fewer-permission-prompts` 跑一次 → 减少重构期权限弹窗。（最快见效）
2. ✅ 加 `npm run pre-pr` 聚合命令 + 写进 CONTRIBUTING（PR#15）。
3. ✅ viewer 代理脚本入仓 + launch.json 固化（`scripts/viewer-preview-proxy.cjs`）。
4. ✅ 一致性自检脚本（`scripts/check-consistency-local.mjs`，PR#15）。
5. 评估 dogfood 自己的 MCP（§3.1）。（中期）
6. 把 `/code-review` + preview 实证写进 STEP 模板的「验证」节，成为默认验收。
