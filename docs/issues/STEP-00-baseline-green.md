# STEP-00：修绿基线（命名失败）

- 线:基线
- 状态:⏭️ 已跳过 — **上游 `c713ecf "test: fix main ci baseline"` 已修复**
- 依赖:无
- 对应 PR:无（不提）

## 结论（基于最新 origin/main 重新分析）

之前的 STEP-00 是在落后 origin/main **49 个提交**的旧分支上规划的。重新同步后确认:

- 上游 commit `c713ecf` 已修好基线，且 `hook-project.test.ts` 的改法与本步**趋同**（都用 `repoBasename = basename(execSync("git rev-parse --show-toplevel"))` 动态对照）。
- **命名取向（已拍板）**:尊重上游，规范名保持 `agent-memory-lab`，manifest 不改名。本步原计划改成 `agentmemory` 的方案**作废**。
- 干净 worktree（`Claude/three-tab-restructure`，基于 `origin/main` c5b4e4c）实测基线:**124 文件 / 1334 用例全绿，0 失败**。

**因此本步无需任何代码改动，跳过。** 后续 STEP 直接在此干净绿基线上推进。

---

<details><summary>历史:旧分支上的原始 STEP-00 内容（备查，已作废）</summary>

原计划:把 3 个 manifest 的 `name` 由 `agent-memory-lab` 改为 `agentmemory`，并把 `hook-project.test.ts` 改为动态对照。前者已被上游否决（保留 `agent-memory-lab`），后者上游已等价实现。

</details>
