---
name: promote-skill
description: Turn repeated lessons into a proposed local Skill update. Use when the user asks to promote experience, update skills, manage local skills, 沉淀经验, or decide which Skill a lesson belongs in.
argument-hint: "[lesson, topic, or skill name]"
user-invocable: true
---

The user wants to promote experience into a Skill: $ARGUMENTS

Workflow:
1. Search relevant lessons with `memory_lesson_recall` using the topic in `$ARGUMENTS`.
2. Inspect local Skill candidates when available from the current environment or viewer skill list.
3. Recommend one of:
   - update an existing Skill
   - create a new Skill
   - keep as lesson only for now
4. Draft a small patch-style proposal:
   - target Skill name/path
   - new rule or workflow text
   - where it should be inserted
   - why it is mature enough
   - what evidence/repeated uses support it

Do not edit Skill files unless the user clearly asks you to implement. Prefer a reviewable proposal first.

Quality bar:
- Promote only lessons that are reusable across future sessions.
- Avoid overfitting to one-off UI preferences unless the user repeated or explicitly confirmed them.
- Keep Skill text short, procedural, and triggerable.
