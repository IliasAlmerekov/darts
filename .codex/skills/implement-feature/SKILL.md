---
name: implement-feature
description: "Implement an approved stage from docs/{feature-slug}/plan/plan.md or a stage file under docs/{feature-slug}/plan/. Use after Research, approved diagram-only Design, and Planning are complete. Runs a bounded multi-agent development loop where coder writes code, tester verifies tests and coverage, security checks risks, reviewer verifies coding-standards and plan compliance; blockers return to coder for at most 3 cycles before handing control back to the developer."
---

# Implement Feature

Use this skill for phase 3 of the multi-agent workflow: Implementation.

Implementation starts only from an approved planning file. The agent receives the plan created by the Design/Planning phase and implements one approved stage at a time.

## Inputs

Required:

- `docs/{feature-slug}/plan/plan.md`

Optional when the plan was split:

- `docs/{feature-slug}/plan/stage-{number}-{short-name}.md`

Context files:

- `docs/{feature-slug}/research/research.md`
- `docs/{feature-slug}/design/design.md`
- `docs/convention/coding-standards.md`
- Relevant `docs/convention/{domain}.md` files for touched code.

Do not start implementation without a plan file and a specific approved stage.

## Output

- Production code changes only within the exact file scope allowed by the selected plan stage.
- Tests for every behavior change.
- Verification command results.
- A concise final report using the required response format.

Do not implement the whole feature unless the selected approved stage explicitly contains the whole safe scope.

## Lead Agent Duties

The active chat agent is the lead orchestrator for this phase. It manages the loop, keeps the stage scope narrow, and enforces the selected plan.

Invoking this skill is an explicit request to use the implementation subagents for this phase. The lead agent must not write production code or tests directly during `implement-feature`.

When subagent runtime is available, the lead agent must coordinate the project-local `coder`, `tester`, `security`, and `reviewer` subagents according to the Development Loop below. Do not create, register, or delegate to a separate `lead_orchestrator` or `lead-orchestrator` subagent.

If subagent runtime is unavailable or blocked, stop before implementation and return a blocked report that names the missing capability. Do not fall back to self-implementation.

Project-local subagent identity is mandatory. A valid implementation subagent is one declared in `.codex/config.toml` under `[agents.<name>]` with its configured `config_file` under `.codex/agents/`. For this phase, the required names are exactly `coder`, `tester`, `security`, and `reviewer`; `explorer` may run only after the full required loop. Generic runtime roles such as `worker`, generic `tester`, generic `reviewer`, or any spawned agent that does not load the matching `.codex/agents/{name}.toml` and `.codex/agents/{name}.md` are not valid substitutes.

Do not simulate a project-local subagent by spawning a generic role and putting "you are the project-local coder" in the prompt. If the runtime cannot dispatch the configured project-local agent by name and config, stop before implementation with a blocked report.

During `implement-feature`, the lead agent must not use `apply_patch`, shell write commands, formatters with `--write`, editor commands, or any other file mutation mechanism on production or test files. If the runtime requires the lead to transfer a `coder`-authored patch into the shared worktree, the transfer must be mechanical and exact; any content decision, conflict resolution, or follow-up code change must go back to `coder`.

Before dispatching `coder`:

1. Read `.codex/config.toml` and confirm `[agents.coder]`, `[agents.tester]`, `[agents.security]`, and `[agents.reviewer]` resolve to project-local config files.
2. Read the selected plan file.
3. Read `docs/convention/coding-standards.md`.
4. Read only the relevant convention domain files.
5. Confirm the exact file scope and allowed changes.
6. Check for dirty worktree changes that overlap the selected file scope.

## Development Loop

Run this bounded loop for the selected implementation stage:

1. Lead assigns the selected stage and exact file scope to `coder`.
2. `coder` writes scoped code and required tests.
3. Lead reviews the `coder` report and verifies the diff stays inside the approved file scope.
4. `tester` checks test coverage, runs targeted tests, and identifies missing behavior coverage.
5. `security` checks security, validation, secrets, authorization, reliability, and unsafe defaults.
6. `reviewer` checks the diff against:
   - the selected plan stage;
   - `docs/{feature-slug}/design/design.md`;
   - `docs/convention/coding-standards.md`;
   - relevant `docs/convention/{domain}.md` files;
   - exact file scope and team rules.
7. If any blocker exists, lead returns the work to `coder`.
8. Repeat the loop at most 3 total cycles.
9. After 3 cycles with unresolved blockers, stop and return control to the developer with a clear blocked report.

The loop exists to improve quality, not to create an endless debate. A blocker must be concrete, reproducible, and tied to a file, rule, failing command, or plan mismatch.

Invalid implementation sequences:

- Lead writes or edits production code/tests, then sends that work to `tester`, `security`, `reviewer`, or `explorer`.
- Lead starts `tester`, `security`, `reviewer`, or `explorer` before a `coder` result exists for the selected stage.
- Lead fixes blocker feedback directly instead of returning the work to `coder`.
- Lead spawns generic runtime roles such as `worker`, generic `tester`, generic `reviewer`, or any agent that does not load the matching project-local `.codex/agents/{name}.toml` and `.codex/agents/{name}.md`.
- Lead prompts a generic agent to behave as `coder`, `tester`, `security`, `reviewer`, or `explorer` instead of dispatching the configured project-local agent.

If an invalid sequence happens, stop immediately and return a workflow-violation report. Do not continue verification and do not mark the stage complete.

## Role Contracts

### coder

- Writes production code and tests.
- Changes only files allowed by the selected plan stage.
- Preserves public APIs unless the plan explicitly allows a change.
- Does not broaden scope to nearby cleanup.
- Reports changed files and targeted verification.

### tester

- Does not implement production code.
- Verifies that behavior changes have tests.
- Runs targeted tests first, then broader commands required by the plan.
- Reports missing coverage as blockers when behavior changed without tests.

### security

- Does not implement production code.
- Looks for secrets, unsafe logging, input validation gaps, auth/authorization regressions, CSRF issues, insecure defaults, and reliability risks.
- Reports only concrete risks with evidence.

### reviewer

- Does not implement production code.
- Reviews correctness, maintainability, plan compliance, and coding-standards compliance.
- Checks that the diff stays inside exact file scope.
- Treats missing tests for behavior changes as blockers.

## Cycle Limit

Maximum cycles: 3.

A cycle is one full pass through coder, tester, security, and reviewer. If tester, security, or reviewer reports a blocker and coder changes code again, the next pass counts as the next cycle.

After cycle 3:

- Do not continue self-fixing.
- Do not start arguments between agents.
- Stop implementation.
- Return control to the developer with:
  - unresolved blockers;
  - evidence;
  - commands already run;
  - files changed;
  - safest next human decision.

## Guardrails

- Do not start without a specific approved plan stage.
- Do not use generic runtime roles as substitutes for project-local `.codex` agents.
- Lead must not author, patch, rewrite, format, or self-fix production code or tests during this phase.
- Do not modify files outside the stage file scope.
- Do not delete or revert user changes.
- Do not change dependencies, migrations, permissions, auth, tokens, or access policy without explicit human approval.
- Do not weaken tests, lint rules, validation, CSRF, authorization, or error handling to pass checks.
- Do not read or expose secrets.
- Do not continue after the third blocked loop.

## Verification

Run the commands required by the selected plan stage.

Minimum local checks for code changes:

```text
npm run typecheck
npm run eslint
npm run test
```

Add these when relevant:

```text
npm run build
npm run stylelint
npm run prettier:check
npm run secrets:check
npm run test:e2e
```

`npm run test:e2e` is required when touching auth, routing, game start, join flow, game flow, responsive-critical UI, or Playwright-covered user journeys.

## Final Response Format

Always include:

- Plan: selected plan stage and cycle count.
- Patch: changed files.
- Commands to verify: commands run and results.
- Rationale: why the changes match the plan, approved design, and coding standards.
- Blockers: unresolved blockers if the loop stopped after 3 cycles.
- Next gate: whether developer approval is needed before the next stage.

## Done Criteria

- Exactly one approved stage was implemented.
- The lead agent delegated implementation to the project-local `coder` and verification to the project-local `tester`, `security`, and `reviewer`, or stopped before implementation because project-local subagent dispatch was unavailable.
- All changes are within the selected stage file scope.
- Tests were added or updated for every behavior change.
- Tester, security, and reviewer found no blockers, or the loop stopped after 3 cycles and returned control to the developer.
- Required verification commands were run or explicitly reported as blocked.
