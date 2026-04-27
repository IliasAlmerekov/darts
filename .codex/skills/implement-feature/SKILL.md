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

The active chat agent manages the loop and owns final integration. The chat agent may coordinate subagents, but must keep the stage scope narrow and enforce the plan.

Before editing code:

1. Read the selected plan file.
2. Read `docs/convention/coding-standards.md`.
3. Read only the relevant convention domain files.
4. Confirm the exact file scope and allowed changes.
5. Check for dirty worktree changes that overlap the selected file scope.

## Development Loop

Run this bounded loop for the selected implementation stage:

1. `coder` writes scoped code and required tests.
2. `tester` checks test coverage, runs targeted tests, and identifies missing behavior coverage.
3. `security` checks security, validation, secrets, authorization, reliability, and unsafe defaults.
4. `reviewer` checks the diff against:
   - the selected plan stage;
   - `docs/{feature-slug}/design/design.md`;
   - `docs/convention/coding-standards.md`;
   - relevant `docs/convention/{domain}.md` files;
   - exact file scope and team rules.
5. If any blocker exists, return the work to `coder`.
6. Repeat the loop at most 3 total cycles.
7. After 3 cycles with unresolved blockers, stop and return control to the developer with a clear blocked report.

The loop exists to improve quality, not to create an endless debate. A blocker must be concrete, reproducible, and tied to a file, rule, failing command, or plan mismatch.

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
- All changes are within the selected stage file scope.
- Tests were added or updated for every behavior change.
- Tester, security, and reviewer found no blockers, or the loop stopped after 3 cycles and returned control to the developer.
- Required verification commands were run or explicitly reported as blocked.
