# Agent Memory Lab 真实 AI 站点测试卡

这份文件是给外部试用者的快速入口。完整版本在仓库的 `docs/browser-extension-ai-site-test-cards-cn.md`。

公开发布前的必测站点：

- ChatGPT：`chatgpt.com` / `chat.openai.com`
- Claude：`claude.ai`
- Gemini：`gemini.google.com`
- Perplexity：`perplexity.ai` / `www.perplexity.ai`

## 每个站点都要确认

- Provider 识别正确。
- 输入框已找到。
- 输入框附近出现“记忆建议”。
- 点击建议后可以插入或复制记忆。
- 同步侧栏可以复制诊断 JSON。
- 原站输入、发送、滚动、模型选择和附件按钮没有异常。

## 保存证据

复制同步侧栏诊断后，在仓库根目录运行：

```bash
npm run record:ai-validation-evidence -- --clipboard --browser "Chrome 版本号" --notes "无隐私信息的备注"
```

只有真实确认“插入记忆成功、诊断已复制、原站输入仍正常”以后，才可以加 `--pass`。

通过证据里必须能看到 `manualValidation.memoryInsertPassed`、`manualValidation.diagnosticsCopied`、`manualValidation.siteInputStillWorks` 三项都为通过。

## 当前边界

本地 demo 通过不等于公开发布通过。公开发布需要 ChatGPT、Claude、Gemini、Perplexity 都有真实页面通过证据。

反馈模板：`docs/external-feedback-template-cn.md`。

GitHub Issue 模板：`.github/ISSUE_TEMPLATE/external-tester-feedback-cn.yml`。
