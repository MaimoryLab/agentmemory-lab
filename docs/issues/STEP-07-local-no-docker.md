# STEP-07：本地去 Docker（保留隐藏）

- 线:B（去 Docker）
- 状态:⬜ 未开始
- 依赖:STEP-00（与线 A 无交叉，可随时并行）
- 对应 PR:`codex/local-no-docker`

## 目标（一句话）

本地启动只走原生 iii 二进制，去掉 Docker 这层可选重量;**保留 engine 与三原语，不动 AGENTS.md 铁律**。docker 物料保留但隐藏（推荐）。

## 背景（实测）

`startEngine()` 已是「原生二进制优先、docker 仅显式 opt-in 或安装失败兜底」。本步主要是**文档/默认/分发收尾**，不是改架构。

## 改动面（取决于「删除 vs 保留隐藏」拍板）

- **保留隐藏（推荐，近乎零代码）**:README/CLI 帮助文本把 docker 从「可选」降为「附录」；确保本地 `start:local-memory` 文档为首选路径；不设 `AGENTMEMORY_USE_DOCKER`。
- **彻底删除（可选，更激进）**:移除 `docker-compose.yml`、`iii-config.docker.yaml`、`.env.example` 的 docker 段、CLI 的 docker 分支与 `discoverComposeFile`。
- 不动:iii-engine、`StateKV`、`state::*`、66 函数、三原语。
- AGENTS 连带项:无（不碰 MCP/REST/版本）。

## 结果预测（执行前填）

- 构建:通过。
- 测试:维持 0 失败。若选「删除」，需检查是否有测试引用 docker-compose（预期 0~1 处，如 deploy 校验）。
- 行为:`npm run start:local-memory` 起原生 engine，全程无 docker；用户安装路径简化为下载 ~6MB 二进制。
- 风险:① 「删除」可能动到 `check:delivery`/deploy 相关脚本对 compose 文件的假设;② CI 的 publish/`files` 列表若含 docker 物料需同步。「保留隐藏」则风险趋近于零。

## 验证命令

```bash
# 不设 AGENTMEMORY_USE_DOCKER
npm run build && npm run start:local-memory   # 确认走原生二进制
npm test
npm run check:workbench
```

## 回滚

revert 单 PR。保留隐藏方案本身几乎无运行时改动，回滚无风险。

## 待你确认

- docker 物料:**保留隐藏** 还是 **彻底删除**？

## 实际反馈（执行后由你回填）

- 构建:
- 测试:
- 行为:
- 与预测的差异:
- 下一步影响:
