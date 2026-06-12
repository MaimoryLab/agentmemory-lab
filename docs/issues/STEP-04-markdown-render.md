# STEP-04：Markdown 渲染

- 线:A（前端三栏）
- 状态:⬜ 未开始
- 依赖:STEP-01（可与 02/03 并行）
- 对应 PR:`codex/markdown-render`

## 目标（一句话）

Agent 回复/观测正文用开源 Markdown 库渲染，替代当前的纯文本/转义展示。

## 改动面

- 文件:`src/viewer/index.html`（引入 marked / markdown-it，渲染 highlights 与观测正文）；`src/viewer/document.ts`（CSP nonce/来源若需放行渲染样式）。
- 不动:数据来源、其他视图。
- AGENTS 连带项:无。

## 结果预测（执行前填）

- 构建:通过；产物体积小幅增加（MD 库 ~30–50KB）。
- 测试:维持 0 失败；新增 1 个「MD 渲染转义安全」测试（恶意 `<script>` 不执行）。
- 行为:代码块、列表、标题正确呈现；可读性明显提升。
- 风险:**XSS / CSP 是头号风险**。MD 渲染必须开启 sanitize 或配合现有 CSP nonce；`viewer-security.test.ts` 是看门测试，**必须仍绿**。库的内联样式可能撞 CSP。

## 验证命令

```bash
npm run build
npm test -- --run test/viewer-security.test.ts
# 手动:渲染含代码块/列表/恶意标签的样本，确认安全+正确
```

## 回滚

revert 单 PR；正文回到纯文本展示。独立、低耦合。

## 实际反馈（执行后由你回填）

- 构建:
- 测试:
- 行为:
- 与预测的差异:
- 下一步影响:
