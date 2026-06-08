# Agent Memory Lab 浏览器插件

这是 Agent Memory Lab 的浏览器插件 MVP，用来把网页上下文保存到本地记忆工作台。

## 现在支持

- 检查本地 Agent Memory Lab 服务是否在线
- 保存当前网页为记忆线索
- 把当前网页上的一条观察保存为经验
- 右键菜单保存当前页面
- 弹窗里查看最近保存记录
- 一键打开本地工作台首页
- 一键打开 Skill 管理台
- 支持自定义 API 地址、Viewer 地址和访问密钥

## 项目结构

```text
manifest.json           Chrome / Edge 扩展入口
service-worker.js       后台协调：API 请求、右键菜单、最近保存记录
content-script.js       只负责采集当前网页上下文
popup.html/js/css       弹窗 UI
options.html/js         本地连接设置
shared/schema.js        统一 PageCapture 数据结构
shared/api.js           统一本地 Agent Memory Lab API 调用
icons/                  插件图标
```

## 数据结构

浏览器插件采集的数据统一成 `PageCapture`：

```js
{
  schemaVersion: 1,
  capturedAt: "2026-06-08T00:00:00.000Z",
  source: "browser-extension",
  page: {
    title: "页面标题",
    url: "https://example.com",
    host: "example.com",
    origin: "https://example.com",
    description: "页面摘要",
    selection: "用户选中的文本",
    headings: ["页面标题结构"]
  }
}
```

所有写入本地记忆、经验和最近保存记录的逻辑都从这个结构转换，避免 popup、content script、service worker 各自拼一套数据。

## 本地预览

1. 打开 Chrome / Edge：`chrome://extensions`
2. 打开“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择本目录：`browser-extension`
5. 确保本地服务已启动：`agentmemory viewer`
6. 点击浏览器工具栏里的 Agent Memory Lab 图标

默认连接：

```text
API: http://localhost:3111
Viewer: http://localhost:3113
```

## 还缺什么

- 页面右键菜单：保存选中文本为记忆
- 网页侧边栏：边浏览边整理
- 自动识别论文、GitHub、飞书、Notion 等页面类型
- 保存前隐私预览
- 与 Viewer 的“待审阅记忆”队列联动
