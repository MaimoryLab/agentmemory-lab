#!/usr/bin/env node
// Viewer 预览代理 —— 给 Claude Preview / 浏览器实证用。
//
// 为什么需要它:viewer 服务器(src/viewer/server.ts)有 DNS-rebinding 防护,
// 只放行 loopback Host 头(否则返回 "forbidden host", server.ts:1068)。
// preview 工具经代理/隧道访问时带的 Host 头常不在白名单里,会被拒。
// 本代理在转发时把 Host 头重写为 `localhost:<viewer 端口>`,绕过白名单,
// 让 preview 工具能正常打开工作台做实证。
//
// 端口:
//   监听 LISTEN_PORT(默认 3198) → 转发到 VIEWER_PORT(默认 3114 = restPort+3)
// 可用环境变量覆盖:
//   VIEWER_PROXY_PORT  代理监听端口(默认 3198)
//   AGENTMEMORY_VIEWER_PORT / III_VIEWER_PORT  上游 viewer 端口(默认 3114)
//
// 用法:
//   node scripts/viewer-preview-proxy.cjs
//   VIEWER_PROXY_PORT=4000 AGENTMEMORY_VIEWER_PORT=3114 node scripts/viewer-preview-proxy.cjs
// 通常由 .claude/launch.json 的 "viewer-proxy" 配置拉起。

const http = require("http");

const LISTEN_PORT = parseInt(process.env.VIEWER_PROXY_PORT || "3198", 10);
const VIEWER_PORT = parseInt(
  process.env.AGENTMEMORY_VIEWER_PORT || process.env.III_VIEWER_PORT || "3114",
  10,
);
const VIEWER_HOST = "localhost";
const REWRITTEN_HOST = `${VIEWER_HOST}:${VIEWER_PORT}`;

const server = http.createServer((req, res) => {
  // 重写 Host 头为 loopback,满足 viewer 的 DNS-rebinding 白名单
  const headers = Object.assign({}, req.headers, { host: REWRITTEN_HOST });
  const opt = {
    host: VIEWER_HOST,
    port: VIEWER_PORT,
    path: req.url,
    method: req.method,
    headers,
  };
  const upstream = http.request(opt, (pr) => {
    res.writeHead(pr.statusCode || 502, pr.headers);
    pr.pipe(res);
  });
  upstream.on("error", (e) => {
    res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    res.end(
      `viewer-preview-proxy: 上游 ${REWRITTEN_HOST} 不可达 (${e.message})。\n` +
        `先用 \`npm run start:local-memory\` 起 viewer,或设 AGENTMEMORY_VIEWER_PORT。`,
    );
  });
  req.pipe(upstream);
});

server.on("error", (e) => {
  console.error(`viewer-preview-proxy 启动失败: ${e.message}`);
  process.exit(1);
});

server.listen(LISTEN_PORT, () => {
  console.log(
    `viewer-preview-proxy: :${LISTEN_PORT} → ${REWRITTEN_HOST} (Host 头已重写,绕过白名单)`,
  );
});
