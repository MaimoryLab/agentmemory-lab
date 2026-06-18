# Feature: LLM todo extraction loop

> Draft scope for the first LLM-backed todo loop. This document answers how
> session ingestion, todo classification, card updates, and evidence navigation
> are expected to work before broader implementation.

## One-line definition

Use recent local sessions as evidence, ask an LLM for structured todo output,
and keep generated cards reviewable, updateable, and traceable back to their
source session.

## Status / Priority

- Status: Draft
- Priority: P0

## Problem

The To-Do tab must not look like a generic memory summary list. Users need
cards that are visibly actionable, grounded in session evidence, and updated
when the source session changes. The current implementation has the core pieces
but the product contract needs to be explicit: when sessions are read, when the
LLM runs, how a card is classified as todo/done/in-progress, and how evidence
helps users return to the original work context.

## Users

- **AI-heavy builder:** works across Codex and browser AI sessions and needs
  unfinished work surfaced without re-reading or manually scanning history.
- **Local-first power user:** wants evidence-backed local cards and control over
  model configuration, cost, and cleanup.

## Goals

- Make the startup contract explicit: first launch reads historical Codex
  session files into the local database; later launches and daemon scans are
  incremental and skip unchanged history.
- Make LLM extraction explicit and observable: the To-Do UI can trigger the
  extraction loop, but it must show progress and whether it used LLM or rules.
- Require structured LLM output with title, description, confidence, time
  bucket, type bucket, dedupe key, and evidence quote.
- Classify generated cards as pending, active, or done based on extracted
  `typeBucket`, not merely because a sentence appears in a session.
- Detect source-session changes after a card is created and mark the card as
  needing recheck without changing the card text automatically.
- Improve evidence navigation so a card can take the user to both the evidence
  panel and the local Codex session/work directory when available.

## Non-goals

- No automatic background LLM calls on daemon startup in this first version.
- No cloud sync.
- No writes back into Codex, browser AI tools, GitHub Issues, or external todo
  apps.
- No new stored todo status enum in this feature. Visual recheck state should
  live in metadata/tags until a migration is approved; archive/delete remain UI
  operations over existing Action records, not new status literals.
- No full connector framework for Claude, OpenClaw, Hermes, or other agents in
  this feature.

## User flow

1. On first daemon startup, Codex session files under the configured roots are
   imported into local `sessions` and `observations`.
2. Later scans read only new or changed files. Unchanged history is skipped by
   source checkpoints.
3. The user opens To-Do and clicks the LLM organize button, or the UI triggers a
   small visible extraction run.
4. The extractor reads recent changed sessions, sends observation blocks to the
   LangExtract sidecar when configured, and falls back to rules if the sidecar
   fails.
5. High-confidence, evidence-valid todos become Actions. Medium-confidence
   todos enter the review queue. Low-confidence or evidence-less candidates are
   discarded.
6. If a source session changes after a card was created, the card shows a
   compact visual recheck indicator. The user can archive/delete it or run LLM
   recheck.
7. The user clicks evidence. The UI jumps to the evidence record and, when
   available, exposes the local work directory/session path as the next action.

## Requirements

| ID | Requirement | Priority |
|---|---|---|
| R1 | First startup imports historical Codex sessions into local storage; follow-up scans are incremental and skip unchanged history | P0 |
| R2 | LLM extraction uses the configured model; default `LANGEXTRACT_MODEL` is `deepseek/deepseek-v4-pro` | P0 |
| R3 | The extraction prompt must require actionable output, source quote, `timeBucket`, `typeBucket`, confidence, and dedupe key | P0 |
| R4 | A todo is stored only when its evidence quote matches the source observation | P0 |
| R5 | `typeBucket=done` maps to `Action.status=done`; `in_progress` and `processing` map to `active`; all other buckets map to `pending` | P0 |
| R6 | Cards created from sessions store enough metadata to compare their source checkpoint with the latest session checkpoint | P1 |
| R7 | If the source checkpoint changes, the card gets a visual recheck state without overwriting title/description automatically | P1 |
| R8 | Evidence jump lands on the evidence item and makes the local Codex session/work directory discoverable when present | P1 |

## Acceptance criteria

- A first run with existing Codex history imports sessions once; a second run
  imports no unchanged files.
- With LangExtract configured, pressing the LLM organize button returns
  `engine=langextract` or `engine=mixed`, and at least one generated card has
  `todo-extracted`, `time:*`, and `type:*` tags.
- With LangExtract unavailable, the same UI action reports rules fallback and
  does not block the To-Do page.
- Every generated card has a short readable title and evidence quote; command
  JSON, file paths, tool logs, and screenshots are rejected as card titles.
- A completed-work sentence creates either a `done` Action or a discarded
  historical candidate; it must not appear as a pending todo by default.
- When a source session changes after card creation, the card renders a compact
  non-text visual recheck state and offers recheck/archive/delete paths.
- Evidence navigation can show the observation, source session id, local session
  file or work directory when available.

## Localization & rules impact

- New user-facing strings must be English-first and added to the viewer i18n
  catalog with Chinese translations.
- Stored enum values stay unchanged: `Action.status` remains the current
  persisted set (`pending`, `active`, `done`, `blocked`, `cancelled`).
- No REST endpoint count change is required unless the evidence deep-link or
  recheck operation needs a new API. If a REST endpoint is added, update
  README, AGENTS.md, `src/index.ts`, and the consistency tests in the same PR.

## Technical notes

- Current startup ingestion is in `src/index.ts` via
  `mem::source-scan::codex`; checkpointed file scanning lives in
  `src/functions/source-scan-codex.ts`.
- Current LLM/rules extraction is `mem::todo-extract-generate` in
  `src/functions/todo-extract.ts`, with the Python LangExtract sidecar in
  `src/functions/todo-extract-langextract.py`.
- Current structured prompt requires action-only extraction, source quote,
  readable title, confidence, time bucket, type bucket, and dedupe key.
- Existing `metadata.todoExtraction` should be extended, if needed, with a
  `sourceCheckpoint` or equivalent stable comparison key. Do not infer stale
  state from UI render time only.
- Evidence navigation should reuse `sourceObservationIds`,
  `metadata.todoExtraction.evidence`, session `cwd`, and scanner source
  metadata before adding new storage.

## Rollout

- Slice 1: default model and documentation update.
- Slice 2: visible recheck state and source-checkpoint metadata.
- Slice 3: evidence jump enhancement for local session/work directory.
- Rollback for slice 1 is reverting the default model/doc PR; rollback for
  later slices must leave existing Actions readable and status-preserving.
