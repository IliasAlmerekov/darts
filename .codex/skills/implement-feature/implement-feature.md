# Implement Feature

Short phase card for Implementation.

The complete skill instruction is in [SKILL.md](SKILL.md). When Implementation starts, read `SKILL.md` first and follow it as the source of truth: it defines the input plan, development loop, subagent roles, cycle limit, and final response format.

## Goal

Implement one approved planning stage through a bounded multi-agent development loop.

The active chat agent is the lead orchestrator. It must coordinate the project-local
`coder`, `tester`, `security`, and `reviewer` subagents and must not write production
code or tests directly during this phase.

Valid subagents must come from `.codex/config.toml` `[agents.<name>]` entries and load
their matching `.codex/agents/{name}.toml` and `.codex/agents/{name}.md` instructions.
Generic runtime roles such as `worker`, generic `tester`, or generic `reviewer` are not
valid substitutes, even when prompted to behave like project-local agents.

The lead must not use `apply_patch`, shell write commands, formatters with `--write`, or
editor commands on production or test files. If the runtime requires the lead to transfer
a `coder`-authored patch into the shared worktree, the transfer must be mechanical and
exact; content changes and conflict resolution go back to `coder`.

If project-local subagent dispatch is unavailable or blocked, the lead stops before
implementation and returns a blocked report instead of self-implementing or falling back
to generic roles.

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

1. Lead confirms `.codex/config.toml` resolves project-local `coder`, `tester`, `security`, and `reviewer`.
2. Lead assigns the selected stage and exact file scope to project-local `coder`.
3. `coder` writes code and tests.
4. Lead verifies the `coder` diff stays inside the approved file scope.
5. Project-local `tester` checks test coverage and runs verification.
6. Project-local `security` searches for security and reliability risks.
7. Project-local `reviewer` verifies compliance with `docs/convention/coding-standards.md`, relevant convention files, the approved design, the selected plan stage, and team workflow rules.

If there is a blocker, the work returns to `coder`.

Invalid sequence: lead writes or fixes production code/tests, then sends that work to
`tester`, `security`, `reviewer`, or `explorer`. If this happens, stop and report a
workflow violation instead of continuing verification.

Also invalid: lead spawns `worker` or any generic runtime role and prompts it to act as
`coder`, `tester`, `security`, `reviewer`, or `explorer`.

## Limit

The loop may run at most 3 cycles. After 3 cycles with unresolved blockers, the agent stops and returns control to the developer with evidence, commands run, changed files, and the safest next decision.
