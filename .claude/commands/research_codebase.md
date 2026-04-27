---
description: "Phase 1: research codebase facts for a specific task"
argument-hint: "<ticket or task description>"
allowed-tools: Read, Write, Glob, Grep, Bash, Agent
---

# Research Codebase

Use this command to narrow a large codebase to the minimum relevant file set for a concrete task.

The active Claude Code chat is the lead orchestrator. Do not create or delegate to a separate lead-orchestrator agent.

## Input

- User-provided task or ticket: `$ARGUMENTS`

## Required Reads

Before writing the research artifact, read:

- `docs/convention/coding-standards.md`
- `docs/repo-map.md`

## Subagents

Launch parallel read-only subagents with `subagent_type: researcher`.

Required subagent model:

- `researcher`: `haiku`

Use separate researchers for relevant slices, such as:

- Architecture, routes, and entrypoints
- Domain models, state, and data structures
- API clients, integrations, and external boundaries
- Existing tests and verification commands
- Security-sensitive paths

Use fewer subagents for a narrow task. Do not duplicate the same slice across agents.

## Output Path

Create:

```text
docs/{feature-slug}/research/research.md
```

Derive `{feature-slug}` from the task in kebab-case.

## Artifact Rules

`research.md` must contain dry facts only:

- Task summary
- Relevant files
- Relevant symbols, components, stores, routes, tests, and commands
- Observed data flow or call paths
- External dependencies already used by the project
- Unknowns that could not be verified

Do not include:

- Opinions
- Refactoring advice
- Implementation plans
- Guesses
- Broad inventories unrelated to the task

End by telling the user the exact research file path.
