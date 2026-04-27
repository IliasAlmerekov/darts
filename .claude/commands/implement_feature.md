---
description: "Phase 3: implement one approved plan or plan stage with bounded subagent review loops"
argument-hint: "<docs/{feature-slug}/plan/plan.md or stage file>"
allowed-tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, Agent
---

# Implement Feature

Use this command only after Design approval and planning files exist.

The active Claude Code chat is the lead orchestrator. Do not create or delegate to a separate lead-orchestrator agent.

## Input

The command receives a planning artifact:

```text
docs/{feature-slug}/plan/plan.md
```

or a specific stage:

```text
docs/{feature-slug}/plan/stage-XX.md
```

## Required Reads

Before editing code, read:

- The provided plan or stage file
- `docs/{feature-slug}/design/design.md`
- `docs/{feature-slug}/research/research.md`
- `docs/convention/coding-standards.md`

## Subagents And Models

Required subagent models:

- `coder`: `opus`
- `tester`: `sonnet`
- `security`: `sonnet`
- `reviewer`: `sonnet`
- `explorer`: `haiku`

Use `explorer` only for focused navigation questions that are not already answered by the research and plan.

## Development Loop

Run at most three implementation cycles.

Each cycle:

1. `coder` implements the selected plan or stage and updates tests.
2. `tester` checks test coverage, runs targeted verification, and reports blockers.
3. `security` checks validation, auth, CSRF, secret handling, unsafe defaults, and data exposure risks.
4. `reviewer` checks the patch against `docs/convention/coding-standards.md`, the plan, and project patterns.

If any subagent reports a blocker, return the work to `coder` for the next cycle.

After three cycles, stop and return control to the human developer with:

- Remaining blockers
- Files changed
- Commands already run
- Recommended next human decision

Do not continue agent debate beyond three cycles.

## Constraints

- Implement only the selected plan or stage.
- Do not silently widen scope.
- Do not commit unless the human explicitly asks.
- Do not install dependencies without human approval.
- Do not edit migrations, secrets, permissions, roles, tokens, or access policy without human approval.
- Run formatter, linter, tests, and project verification commands appropriate to the changed files before declaring done.

## Final Output

Report:

- Plan followed
- Patch summary
- Commands run and results
- Reviewer, tester, and security status
- Remaining risks or blockers
- Brief rationale
