# AI Todo v1 功能收口确认（草案 v0.1）

> 用途：2026-06-17 版本确认会的**拍板底稿**。逐条过「确认 / 推迟 v1.1 / 砍」，定 ship deadline。
> 状态：🟡 草案，**待 2026-06-17 确认** · 来源：ACTION-ITEMS AI-2（齐木 Jason）/ PLAN-003 STEP-02。
> 确认后：回填 `PRD.md §Open Questions`（5 个 TBD）+ 更新 `ROADMAP.md` + 回填 STEP-02「实际反馈」。
> 依据：`PRD.md`、`ROADMAP.md`、PLAN-001（i18n）、PLAN-002（最小 AI→工作台，含代码现状审查）。
>
> 说明：本文按名引用的 `ACTION-ITEMS` / `PLAN-001..004` / 各 `STEP-*` 都在一个**独立的指挥仓库**（command repo，只做规划、不随本产品仓 `MaimoryLab/AI-Todo` 发布）。因此本文**不外链**这些文件（链接在 GitHub 上会失效），只按名引用，正文力求自包含。

---

## 0. 一页结论（提议，待确认）

- **v1 定义（提议）**：本地优先的「AI 工作流待办抽取」最小闭环——**Codex + 浏览器**两来源 → 增量、不重读地抽成带证据的 todo → 本地 Web UI（三栏 + 状态筛选）查看与手动 done/ignore/delete → UI 字符串 i18n-ready（默认英文）→ 配齐开源文档。
- **抽取方式（提议）**：v1 用**规则式**（`action-candidates`），**LLM 分类器推 v1.1**。
- **二维工作台（时间×类型 + 历史默认隐藏，PLAN-002 STEP-04/05）**：**建议进 v1**，但若赶 deadline 可降级为 v1.1（详见 §4 标注）。
- **ship deadline（提议）**：**待拍板**——但必须基于 §5 的「现实差距」来定，不能拍一个无视未建工作量的日期。给两套方案见 §5。

---

## 1. PRD 的 5 个 Open Questions —— 提议答案

> 对应 `PRD.md §5 Open Questions`（目前全 `TBD`）。确认后逐条回填 PRD。

| # | Open Question | 提议答案（v1） | 依据 | 确认 |
|---|---|---|---|---|
| 1 | 初始技术栈 | **Node.js 守护进程 + SQLite + 浏览器扩展 + 轻量 Web UI**（即现状栈，iii-engine/StateModule/viewer 已是这套） | PRD 推荐候选 + 现仓即此栈 | ☐ 确认 ☐ 改 |
| 2 | 首个 local source | **Codex** | PLAN-002 STEP-01；现已能解析 Codex JSONL | ☐ 确认 ☐ 改 |
| 3 | 首个 browser source | **浏览器 AI 站点抓取**（扩展已在抓，落 Session+observations） | PLAN-002 §3 现状 | ☐ 确认 ☐ 改 |
| 4 | 是否上 LLM 分类器 | **v1 否**，用规则式抽取；LLM 标 **v1.1** | PRD 工具表 LLM=TBD、规则式=Yes；PLAN-002 §2 范围外 | ☐ 确认 ☐ 改 |
| 5 | v1 deadline | **见 §5 两方案，待拍板** | 取决于未建工作量 | ☐ 定为 ______ |

---

## 2. v1 功能确认表（对照 PRD §5 v1/MVP Scope）

> 状态列含义：✅ 已具备（今天就有） · 🔨 待建（指向负责的 STEP） · 决策列勾选最终归属。

| v1 功能（PRD §5 / 用户故事） | 当前状态 | 缺口落点 | 决策 |
|---|---|---|---|
| 本地守护扫描 ≥1 个 local source（Codex），增量不重复 | 🔨 解析有、**自动扫描器无**（现为手动 `import-jsonl`，无 sources/scan_checkpoints 表） | PLAN-002 STEP-01 + STEP-02（首启回填 + 水位线） | ☐ v1 ☐ v1.1 |
| 浏览器扩展捕获 ≥1 个 browser source，写入同一抽取管线 | 🔨 抓取有、**仅 evidence-only**，未进 action 抽取 | PLAN-002 STEP-03 | ☐ v1 ☐ v1.1 |
| 本地 DB 存 todos + evidence（每条 todo ≥1 证据） | ✅ 基本具备（Session/observations/actions；证据链已有） | — | ☐ v1 ☐ v1.1 |
| 本地 Web UI 显示 active todos + 按状态筛选 | ✅ 三栏 viewer + 待办筛选已有 | — | ☐ v1 ☐ v1.1 |
| 手动 done / ignore / delete（+ archive 可见） | ✅ 基本具备（done-today 折叠等） | — | ☐ v1 ☐ v1.1 |
| 核心 UI 字符串 i18n-ready，默认英文 | 🔨 **零 i18n 基础设施**，viewer ~900 条硬编码中文 | PLAN-001 STEP-01/02/03（+06 守卫） | ☐ v1 ☐ v1.1 |
| 用户可见品牌统一为 AI Todo | 🔨 ~336 文件仍含旧品牌 | PLAN-001 STEP-04（显示面）/ PLAN-004（工程面） | ☐ v1 ☐ v1.1 |
| 文档齐：README/FEATURES/ARCHITECTURE/RULES/ROADMAP | 🔨 README/ROADMAP 在；**FEATURES/ARCHITECTURE/RULES 缺**（README 标 planned） | PLAN-003 STEP-01（RULES/ARCH）/ STEP-03（FEATURES + 流程） | ☐ v1 ☐ v1.1 |
| 通用 connector 接口（文档化，不需可用集成） | 🔨 缺；**提议 v1 = 仅在 `ARCHITECTURE.md` 描述通用接口契约，不实现任何具体 connector**（满足 PRD「Required in v1：文档化」） | PLAN-003 STEP-01（ARCHITECTURE 内描述） | ☐ v1（仅文档化） ☐ v1.1 |
| **二维分类（时间×类型）+ 历史默认隐藏** | 🔨 无（现为单轴 status 分组） | PLAN-002 STEP-04/05 | ☐ v1（建议） ☐ v1.1 |
| 守护刷新不打断当前视图（泛化到工作台） | 🔨 仅 sessions 详情有 | PLAN-002 STEP-06 | ☐ v1 ☐ v1.1 |

> 注：官网（黑金风）与产品 App（浅色暖石风）当前是两套互相矛盾的视觉品牌——**品牌统一是一个开放决策**，不阻塞 v1 功能，可单列推进。（背景见已重写的 `DESIGN.md §11`；若该重写尚未合入，本条仍独立成立。）

---

## 3. v1 明确不做（沿用 PRD §Non-Goals，确认即可）

云同步 · 团队空间/权限 · 主动通知 · 自动写入飞书/Slack/Discord/Telegram/Linear/Jira · 大而全个人记忆台 · 改写源对话 · 支持「所有」agent 来源 · 整段历史机器翻译 · 每页文档全量翻译。

☐ 确认以上 v1 全部不做。

---

## 4. 二维工作台：进 v1 还是 v1.1？（需要单独拍）

- **进 v1 的理由**：是产品的差异化「工作台」体验（PLAN-002 主线目标），单轴 status 分组体验单薄。
- **降级 v1.1 的理由**：PLAN-002 STEP-04（二维 enum 定稿，高难度、有返工风险）+ STEP-05（渲染）+ STEP-06（刷新）合计 3 个 PR、且 STEP-04 的 enum 语义还有待评审。砍掉它，v1 仍是完整可用的「抽取 + 列表 + 证据 + 清理」闭环。
- **提议**：**进 v1，但作为 deadline 的第一调节阀**——若 §5 的全量方案排不进目标日期，先把 STEP-04/05/06 移到 v1.1。

☐ 进 v1 ☐ 推 v1.1

---

## 5. 现实差距 → ship deadline 两方案（核心）

**截至 2026-06-16 能跑的**：解析 Codex JSONL（手动导入）、浏览器抓取存证据、规则式按需抽取、三栏 viewer + 筛选 + 手动清理、证据链。
**v1 要补的（全部 ⬜ 未开工）**：见 §2 的 🔨 行。下面按「一步=一个 PR、产品始终可用」估算。

### 方案 A — 最小可承诺集（PRD 底线，最早可交付）
必交 PR（约 8–9 个，含 1 个高难度簇）：
- PLAN-002 STEP-01（Codex 扫描器，高）、STEP-02（首启回填+水位线，高）、STEP-03（浏览器→抽取，中）
- PLAN-001 STEP-01（viewer i18n 基座，中）、STEP-02（全量外置，**拆 4 子 PR**，高）、STEP-03（扩展 i18n，中）、STEP-04（品牌，中）
- PLAN-003 STEP-01（RULES/ARCHITECTURE + README 收口）、STEP-03（FEATURES + 评审流程）

砍/推 v1.1：二维工作台（PLAN-002 STEP-04/05/06）、PLAN-001 STEP-05/06。

### 方案 B — PRD-faithful 全量（含二维工作台）
= 方案 A + PLAN-002 STEP-04/05/06 + PLAN-001 STEP-06（i18n 守卫）+ PLAN-001 STEP-05（文档 i18n 策略）。约 +5 PR（含 2 高难度）。

> **deadline 推导**：以「一次一个可合并 PR」节奏，方案 A ≈ 10–13 个 PR（STEP-02 拆 4 子步），方案 B ≈ 15–18 个。**请按团队真实周吞吐量定日期**——把 PR 数 ÷ 周吞吐量 = 周数。草案不替团队定速度；建议会上先选方案(A/B)，再据吞吐量落一个**带 buffer 的目标日**，并设一个「中点 checkpoint」复核。

☐ 选方案 A ☐ 选方案 B ☐ 目标 ship 日期：__________ ☐ 中点 checkpoint：__________

---

## 6. v1 验收门槛（沿用 PRD §Success Criteria / Evaluation，确认作为 v1 gate）

- 50 个会话抽 ≥20 候选 todo；人审 ≥50% 有用。
- 重跑扫描重复率 ≤5%（首启后再启动/刷新 0 次重读历史）。
- 500 条 todo UI 加载 <2s；核心 UI 字符串 100% 外置、无硬编码。
- 每条 todo ≥1 证据；状态准确率 ≥70%；噪声 ≤30%。

> ⚠️ **Gate blocker**：以上门槛要可度量，前提是先建好「标注评测集」（≥50 本地会话 + ≥10 浏览器对话，含应产出 0 todo 的负例，见 PRD §Evaluation）。该数据集**目前尚未就绪**——它本身是一项 v1 前置工作，未就绪前这些门槛无法实际跑分，故不能视为「已可执行」。

☐ 确认以上为 v1 发布门槛　☐ 确认「先建标注评测集」为 v1 前置任务（owner: ______，落点建议挂 PLAN-002 或单列）

---

## 7. 确认后待办（会后立即做）

1. 回填 `PRD.md §Open Questions` 5 条（用 §1 拍板结果）。
2. 更新 `ROADMAP.md`：写实 v1 范围 + ship 日期（注意现 ROADMAP 仍是 agentmemory 的旧路线图，属 PLAN-004 改名范围，回填时一并对齐）。
3. 回填 PLAN-003 STEP-02（指挥仓库，未入本产品仓）的「实际反馈」：确认集 / deadline / 推迟项 / 下游影响。
4. 据拍板范围，更新 PLAN-001/002 看板里哪些 STEP 属 v1、哪些移 v1.1。
5. （AI-3/AI-4）启动 PLAN-003 STEP-01/03，把 FEATURES/ARCHITECTURE/RULES 从 planned 变存在。

---

## 8. 明天会上要拍的决定（清单）

1. 5 个 Open Questions 的答案（§1）。
2. 二维工作台进 v1 还是 v1.1（§4）。
3. 范围方案 A 还是 B（§5）。
4. ship 目标日期 + 中点 checkpoint（§5）。
5. 确认 v1 验收门槛（§6）。
6. 确认 v1 Non-Goals（§3）。
