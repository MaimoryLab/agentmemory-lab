# 开发环境与 CI 实情

记录重构期间的环境事实、命令、CI 行为和**基线状态**。事实优先于记忆——本文件的数字都来自实跑。

## 1. 本地环境

- 仓库:内层 `agentmemory-lab/` 是唯一 git 仓库（外层 `AgentMemory- Session/` 是非 git 的文档外壳）。
- 实测本机:Node `v24.16.0` / npm `11.13.0`。
- 项目要求:`engines.node >= 20`；CI 跑 Node 20 与 22。
- 构建:TypeScript → ESM via tsdown，输出 `dist/`。
- 状态:文件 SQLite，经 iii-engine（WebSocket `49134`）；详见方案 §12。

## 2. 常用命令

```bash
npm run build              # tsdown 构建 + 拷贝 viewer/config 资源
npm test                   # vitest run，排除 integration（CI 跑的就是这个）
npm test -- --run test/viewer-*.test.ts   # 只跑受影响测试，省时
npm run check:workbench    # API / Viewer / demo 可达性
npm run check:delivery     # build + 插件 + README 截图 + 交付文档校验
npm run start:local-memory # 用既有本地记忆数据目录启动
```

## 3. CI 实情（决定 PR 怎么切）

来源:`.github/workflows/ci.yml` + `publish.yml`。

| 维度 | 事实 |
|---|---|
| 触发 | push/PR 到 `main`；`workflow_dispatch` 手动 |
| **paths-ignore** | `**/*.md`、`**/*.mdx`、`website/**`、`docs/**`、`assets/**`、README/CHANGELOG/AGENTS/ROADMAP **不触发 CI** |
| 矩阵 | `os: [ubuntu, macos] × node: [20, 22]` = **4 格**，`fail-fast: false` |
| 每格步骤 | `npm install --package-lock-only` → `npm ci` → `npm run build` → **`npm test`（全量）** |
| 测试粒度 | 全量，**没有按目录/分片**；红就是整格红 |
| 并发 | 同 ref 的 PR 跑会被新推送 `cancel-in-progress`（push 到 main 不取消） |
| lockfile | **gitignore**，runner 内现生成 → 无 lockfile 冲突，但新依赖会改 4 格安装图 |
| Windows | 暂排除（`obsidian-export` 硬编码 POSIX 路径） |
| 发布 | `publish.yml` 在 release 时跑，`build + test` 后 npm publish 三个包，带 `--provenance` |

**杠杆**:文档类改动零 CI 成本，可用来先合方案/锁文档。
**陷阱**:任何碰 MCP 工具 / REST 端点 / 版本号的改动，要按 AGENTS.md 同步改 7~8 处，否则计数断言红。

## 4. 基线状态 ✅ 已修绿（STEP-00，2026-06-12）

```text
Test Files  128 passed (128)
     Tests  1384 passed (1384)
  Duration  ~7s
```

STEP-00 已消除原 8 个命名失败（详见 `issues/STEP-00-baseline-green.md`）。权威项目名锁定为 `agentmemory`。

<details><summary>历史:修复前的 8 个失败（保留备查）</summary>

8 个失败同一根因:检出目录名 `agentmemory-lab`，测试硬编码期望 `agentmemory`。
- `test/hook-project.test.ts`(5)、`test/codex-plugin.test.ts`(2)、`test/copilot-plugin.test.ts`(1)。
- 修法:3 个 manifest `name` 对齐 `agentmemory`；hook-project 测试改为运行时动态取 git 顶层目录名。

</details>

## 5. `npm run build` 状态

构建可用（dist/ 存在且 viewer 资源齐全）。重构中每个代码 PR 推前本地必跑 `npm run build`，避免 4 格 runner 才发现构建错。
