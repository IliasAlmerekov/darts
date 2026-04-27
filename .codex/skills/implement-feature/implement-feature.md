# Implement Feature

Short phase card for Implementation.

The complete skill instruction is in [SKILL.md](SKILL.md). When Implementation starts, read `SKILL.md` first and follow it as the source of truth: it defines the input plan, development loop, subagent roles, cycle limit, and final response format.

## Goal

Implement one approved planning stage through a bounded multi-agent development loop.

## Input

The agent receives the planning file created after approved Design:

```text
docs/{feature-slug}/plan/plan.md
```

If planning was split into stages, the agent also receives the selected stage file:

```text
docs/{feature-slug}/plan/stage-{number}-{short-name}.md
```

## Loop

One cycle runs:

1. `coder` writes code and tests.
2. `tester` checks test coverage and runs verification.
3. `security` searches for security and reliability risks.
4. `reviewer` verifies compliance with `docs/convention/coding-standards.md`, relevant convention files, the approved design, the selected plan stage, and team workflow rules.

If there is a blocker, the work returns to `coder`.

## Limit

The loop may run at most 3 cycles. After 3 cycles with unresolved blockers, the agent stops and returns control to the developer with evidence, commands run, changed files, and the safest next decision.
