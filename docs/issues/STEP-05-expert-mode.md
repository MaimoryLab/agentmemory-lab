# STEP-05：专家模式开关（收纳被砍视图）

- 线:A（前端三栏）
- 状态:⬜ 未开始
- 依赖:STEP-01
- 对应 PR:`Claude/expert-mode`

> ⚠️ 来自 STEP-01 的输入:STEP-01 删除了 `tab-extra`/`tab-extra-toggle`/`tab-group-label` 的 DOM，但保留了 `switchTab`(~4883) 与事件委托(~8507) 中对它们的**死引用**（有守卫、不崩溃）和 `advancedTabs` 局部变量。本步实现专家模式折叠分组时，应**复用或清理**这套逻辑，而不是再造一套。被隐藏视图的 11 个 `.tab-bar button[data-tab=X] .tab-icon` CSS 图标定义（~205 行起）也由 STEP-01 保留，本步放回 tab 时直接复用。

## 目标（一句话）

加一个专家模式开关（设置项或 `?expert=1`），开启后在导航末尾恢复被砍/被隐藏的视图（记忆、Skill、graph、profile、audit、replay、crystals），保住后端资产不丢。

## 改动面

- 文件:`src/viewer/index.html`（专家开关状态 + 条件性把这些 tab 加回 `TAB_IDS` / 放开 `TAB_REDIRECTS`；持久化到 localStorage 或 query）。
- 不动:这些视图的渲染函数（本就在文件里，本步只是放行入口）。
- AGENTS 连带项:无。

## 结果预测（执行前填）

- 构建:通过。
- 测试:维持 0 失败；新增 1 个「专家模式切换 tab 集合」测试。
- 行为:默认三栏干净；开专家模式后进阶分组出现，原 6 隐藏视图可达。
- 风险:被隐藏视图的渲染函数久未走通，放行后可能首次暴露既有运行时错误（数据格式漂移）。需逐个点验，必要时标注「实验性」。

## 验证命令

```bash
npm run build
npm test -- --run test/viewer-graph-cooldown.test.ts
# 手动:开关专家模式，逐个点开 graph/profile/audit/replay/crystals 看是否报错
```

## 回滚

revert 单 PR；专家入口消失，主三栏不受影响。

## 实际反馈（执行后由你回填）

- 构建:
- 测试:
- 行为:
- 与预测的差异:
- 下一步影响:
