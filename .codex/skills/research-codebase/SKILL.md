---
name: research-codebase
description: Research the codebase before a feature, bugfix, or architecture change. Use when Codex must reduce a large project to the minimum verified fact set, run parallel read-only researcher subagents, and create docs/{feature-slug}/research/research.md with no implementation, solution design, speculation, or refactoring advice.
---

# Research Codebase

Use this skill for phase 1 of the multi-agent workflow: Research.

The purpose of this phase is to reduce a large codebase to the smallest useful set of files and verified facts for a specific task. Research does not design a solution, write production code, or suggest refactoring.

The only required output is:

```text
docs/{feature-slug}/research/research.md
```

## Inputs

- The user request, ticket, or task text.
- The current repository state.
- `docs/convention/coding-standards.md` as the required entry point for project rules.
- `docs/repo-map.md` for fast navigation, when it exists.
- Current library docs through Context7 when library behavior is uncertain.

## Output Contract

Create exactly one research artifact:

```text
docs/{feature-slug}/research/research.md
```

`{feature-slug}` is a short kebab-case task name. Use only lowercase Latin letters, digits, and hyphens. If the task title is in another language, normalize it to a clear English slug.

Do not create design, plan, or implementation files during this phase.

## Lead Agent Duties

The lead agent owns orchestration and the final artifact. The lead should not read the whole project linearly when focused subagents can gather enough relevant context.

Project-local subagent identity is mandatory. Research subagents must be instances of the project-local `researcher` agent declared in `.codex/config.toml` under `[agents.researcher]` with `config_file = "agents/researcher.toml"` and instructions from `.codex/agents/researcher.md`. Generic runtime roles, `architect`, `explorer`, or any spawned agent that does not load the project-local `researcher` config and instructions are not valid substitutes.

Do not simulate a project-local `researcher` by spawning `architect`, `worker`, generic `explorer`, or another generic role and putting "you are a researcher" in the prompt. If the runtime cannot dispatch the configured project-local `researcher`, stop before research fan-out with a blocked report.

Workflow:

1. Read `docs/convention/coding-standards.md`.
2. Read `docs/repo-map.md`, if it exists.
3. Read `.codex/config.toml` and confirm `[agents.researcher]` resolves to the project-local researcher config file.
4. Define the task scope and preliminary `{feature-slug}`.
5. Start several project-local `researcher` subagents with narrow research directions.
6. Merge subagent outputs into one `research.md`.
7. Remove noise: opinions, advice, unevidenced guesses, and long code excerpts.
8. Mark missing data as `NOT FOUND` when it was searched for and not found.

## Subagent Split

Start independent project-local `researcher` subagents in parallel when the runtime supports subagents. Use the model configured by `.codex/agents/researcher.toml`.

Default directions:

- Architecture direction: project structure, layer boundaries, routes, dependency direction, key entrypoints.
- Domain direction: domain types, stores, business rules, DTOs, mappers, state.
- Integration direction: API, SSE, browser APIs, external contracts, network clients.
- Test direction: existing Vitest, Testing Library, and Playwright coverage, test helpers, coverage gaps.
- Risk direction: security, reliability, validation, error handling, and other risk areas from applicable convention docs.

For a narrow task, reduce the number of directions if appropriate. Never mix facts with solution design.

The `architect` agent is reserved for Design and Planning. Do not use `architect` for Research, including the Architecture direction.

## Subagent Prompt Template

Use this template for each subagent and replace `{direction}` and `{task}`:

```text
You are a read-only codebase researcher for the Research phase.

Task: {task}
Direction: {direction}

Read only the files needed for this direction. Do not edit files. Do not propose implementation, architecture changes, refactors, or product decisions.

Return only dry facts with evidence:

## Direction: {direction}

### Facts
- [F-{AREA}-001] Fact. Evidence: `path/to/file.ts:line`

### Relevant Files
- `path/to/file`: why it matters

### Unknowns
- [U-001] `NOT FOUND`: what was searched and not found
```

## Evidence Rules

- Every important fact must include evidence as `path:line` when a line can be identified.
- If a fact depends on multiple locations, list multiple evidence references.
- If data is missing, use `NOT FOUND` and briefly state where it was searched for.
- Do not include large code blocks in the artifact.
- Do not infer facts from file names or similarity without checking the source.
- Keep facts separate from unknowns. Do not turn unknowns into assumptions.

## Prohibitions

- Do not write production code.
- Do not change files except `docs/{feature-slug}/research/research.md`.
- Do not dispatch `architect`, `worker`, generic `explorer`, or any non-`researcher` agent for research directions.
- Do not design the solution.
- Do not write "better to do it this way".
- Do not suggest refactoring.
- Do not plan implementation.
- Do not expand scope beyond the task.
- Do not read the whole project when enough relevant context has already been found.
- Do not include secrets, `.env` values, tokens, or private credentials.

## research.md Template

```markdown
# Research: {Task Name}

## Task

Briefly describe the task in 2-4 lines.

## Scope Boundary

- In scope:
- Out of scope:

## Relevant Project Rules

- `docs/convention/coding-standards.md`: list the applicable domains.
- `docs/convention/{domain}.md`: summarize applicable rules if a domain file was read.

## Facts

### Architecture

- [F-ARCH-001] Fact. Evidence: `path/to/file.ts:line`

### Domain And Data

- [F-DATA-001] Fact. Evidence: `path/to/file.ts:line`

### Integrations

- [F-INT-001] Fact. Evidence: `path/to/file.ts:line`

### Tests

- [F-TEST-001] Fact. Evidence: `path/to/file.test.ts:line`

### Risks

- [F-RISK-001] Risk fact. Evidence: `path/to/file.ts:line`

## Relevant Files

| Path      | Why It Matters |
| --------- | -------------- |
| `src/...` | ...            |

## Unknowns

- [U-001] `NOT FOUND`: what was not found or requires a human decision.

## Context For Next Phase

The minimum fact list that Design must use.
```

## Done Criteria

- `docs/{feature-slug}/research/research.md` exists.
- All research fan-out used project-local `researcher` subagents, or stopped before fan-out because project-local researcher dispatch was unavailable.
- The artifact contains only facts, relevant files, and unknowns.
- Every important fact has evidence or `NOT FOUND`.
- The artifact contains no solution, implementation plan, production code, or refactoring advice.
- The context is narrow enough that Design should not need to reread the whole project.
