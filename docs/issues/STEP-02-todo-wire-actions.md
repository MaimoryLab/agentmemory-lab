# STEP-02：待办栏接数据（待处理一区先通）

- 线:A（前端三栏）
- 状态:⬜ 未开始
- 依赖:STEP-01
- 对应 PR:`codex/todo-wire-actions`

## 目标（一句话）

待办栏接上现有后端，先把「🟡 待处理」一区跑通:列出 action、显示 reason/priority、支持确认/编辑/忽略。

## 改动面

- 文件:`src/viewer/index.html`（待办视图渲染 + fetch `/agentmemory/actions`、`/agentmemory/review/actions/generate`、`/agentmemory/frontier`）。
- 不动:后端 action 逻辑（已就绪）；待回应/已完成分区（STEP-06 / 后续）。
- AGENTS 连带项:无（仅消费既有 REST，不新增端点）。

## 结果预测（执行前填）

- 构建:通过。
- 测试:维持 0 失败；新增 1~2 个前端渲染/排序测试（参考 `viewer-memories-sort.test.ts` 模式）。
- 行为:待办栏显示真实 action，按 priority 排序，`blocked/failed` 权重高置顶；可改状态。空数据时有空态。
- 风险:`frontier`/`actions` 返回结构与前端假设不符（字段名/嵌套）；需先 `curl` 一次确认 wire shape。本地需有 engine 跑起来才有数据。

## 验证命令

```bash
npm run start:local-memory   # 起服务产生真实数据
curl -s localhost:3111/agentmemory/actions | head
npm run build
npm test -- --run test/viewer-memories-sort.test.ts
```

## 回滚

revert 单 PR；待办栏回到 STEP-01 的空骨架。

## 实际反馈（执行后由你回填）

- 构建:
- 测试:
- 行为:
- 与预测的差异:
- 下一步影响:
