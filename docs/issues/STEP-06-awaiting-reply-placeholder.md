# STEP-06：待回应分区（前端占位）

- 线:A（前端三栏）
- 状态:✅ 单测+浏览器实证绿,待开 PR
- 依赖:STEP-02
- 对应 PR:`Claude/awaiting-reply`

## 目标（一句话）

在待办栏顶部加「🔴 待回应」分区。后端缺「Agent 提问、等用户回应」语义，本步用**前端占位**:以 action 的某 tag/reason 或 `signals` 数据近似填充，把 UI 形态先立起来。

## 改动面

- 文件:`src/viewer/index.html`（待回应分区渲染 + 数据来源近似:复用 action（带特定 tag）或读 `signals`）。
- 不动:不新建后端语义（留给后续独立的后端 STEP）。
- AGENTS 连带项:无（不新增端点；若决定读 signals 用现有端点）。

## 结果预测（执行前填）

- 构建:通过。
- 测试:维持 0 失败；新增 1 个分区渲染测试。
- 行为:待回应分区出现在最顶部，默认展开；有「回复 / 转待处理 / 看原文」动作位（回复动作本步可先占位 disabled）。
- 风险:**这是占位，不是真能力**——需在 UI 上诚实标注或确保数据来源不误导。最大风险是把「近似数据」当成真待回应展示，造成误解。需与你确认占位数据源。

## 验证命令

```bash
npm run build
npm test -- --run test/viewer-memories-sort.test.ts
# 手动:确认分区顺序(待回应>待处理>已完成)与空态
```

## 回滚

revert 单 PR；待办栏回到 STEP-02 的「待处理」单区。

## 待你确认

- 占位数据源:用 action+tag 近似，还是接 `signals`？
- 「待回应」是否你最看重的一类（影响是否值得尽早补后端真语义）？

## 实际反馈（执行后由你回填）

- 构建:✅ `npm run build` 通过。
- 测试:✅ `npm test` **127 文件 / 1353 用例全绿,0 回归**。在 `test/viewer-session-id.test.ts` 新增 1 用例:验证待回应分区存在、空态文案诚实(「暂无待回应」+「尚未接通」)、且渲染在 action 分组之前(顶部)。
- 浏览器实证:`preview_inspect` + 截图——待回应分区在待办栏顶部,含红点标识、「即将上线」徽章、空态说明;console 无 error。
- **占位数据源决策（已拍板:空态占位）**:核查后端发现 `/agentmemory/signals` 是 **agent 间消息原语**(`from`/`to`/`content`/`replyTo`,读取需 `agentId`),**不是**「Agent→用户、等用户回应」语义。用它既要 agentId、语义又不对,会误导。action+tag 近似当前也没有任何 action 带相关 tag(实际仍空)。故按计划「诚实标注」原则,**不接任何近似数据源**,只立 UI 形态 + 诚实空态。
- 实际改动（仅 `src/viewer/index.html`）:
  1. 新增 `renderAwaitingReplySection()`:固定渲染「待回应」分区(红点标题 + 副标题 + 「即将上线」徽章 + 虚线框空态)。空态文案明说该能力需后端「Agent→你」异步通道(规划经 lark-cli + 飞书机器人投递),尚未接通。
  2. `renderActions` 在 metric cards 之后、待确认/action 分组之前插入该分区。
  3. 新增 `.awaiting-reply-*`/`.awaiting-dot` CSS。
- 与预测的差异:
  - 预测担心「把近似数据当成真待回应展示造成误解」——通过**完全不接数据、只做诚实空态**规避。比「接 signals/tag」更稳妥,也更符合产品诚实原则。
  - 分区顺序为 待回应(顶部) > 待确认 > active/blocked/pending/done/cancelled,符合预测的「待回应最顶部」。
- 下一步影响(下游待更新清单):
  - **线 A（前端三栏）至此全部完成**(01–06)。
  - 真正的「待回应」能力需独立的**后端 STEP**:定义 Agent→用户异步消息语义 + REST 端点,再把本分区从空态接到真实数据,并接 lark-cli + 飞书投递出口。本步只交付前端形态。
