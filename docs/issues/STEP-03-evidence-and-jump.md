# STEP-03：证据栏 + 待办→证据跳转

- 线:A（前端三栏）
- 状态:⬜ 未开始
- 依赖:STEP-02
- 对应 PR:`codex/evidence-and-jump`

## 目标（一句话）

证据栏接 `session/highlights` + `timeline`，并实现「待办条目点击 → 用 `sourceObservationIds` 跳到对应证据原文并高亮」。

## 改动面

- 文件:`src/viewer/index.html`（证据视图渲染 + fetch `/agentmemory/session/highlights`、`/agentmemory/timeline`；待办条目「看原文」按钮 → 切到证据栏 + 滚动/高亮目标观测）。
- 不动:后端（highlights/timeline 已就绪）；Markdown 渲染（STEP-04 接管正文格式）。
- AGENTS 连带项:无。

## 结果预测（执行前填）

- 构建:通过。
- 测试:维持 0 失败；新增 1 个「跳转目标解析」单测（给定 sourceObservationIds → 定位逻辑）。
- 行为:证据栏按会话展示重点+时间线；从待办点「看原文」能跳到来源观测并高亮。
- 风险:① `sourceObservationIds` 可能为空（某些 action 无来源）→ 需降级为「无可跳来源」提示；② highlights 与 timeline 的 observation id 对不齐 → 跳转落空。两者都需在真实数据上验证。

## 验证命令

```bash
npm run start:local-memory
curl -s "localhost:3111/agentmemory/session/highlights?sessionId=<id>" | head
npm run build
npm test -- --run test/viewer-session-id.test.ts
# 手动:待办点「看原文」验证跳转+高亮
```

## 回滚

revert 单 PR；证据栏与跳转一起回退，待办栏不受影响。

## 实际反馈（执行后由你回填）

- 构建:
- 测试:
- 行为:
- 与预测的差异:
- 下一步影响:
