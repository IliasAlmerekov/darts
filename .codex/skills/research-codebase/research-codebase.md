# Research Codebase

Short phase card for Research.

The complete skill instruction is in [SKILL.md](SKILL.md). When Research starts, read `SKILL.md` first and follow it as the source of truth: it contains the trigger description, result contract, subagent orchestration rules, artifact template, and done criteria.

## Goal

Reduce a large codebase to the minimum verified fact set needed for one concrete task.

## Result

```text
docs/{feature-slug}/research/research.md
```

The artifact must contain only dry facts about the project: what exists where, which files matter, and which data was not found. It must not contain opinions, guesses, refactoring advice, a solution, or code.

## Principle

The lead agent starts several parallel project-local `researcher` subagents with narrow directions: architecture, domain/data, integrations, tests, and risks. Each subagent returns only facts, relevant files, and unknowns with evidence in `path:line` format.

Valid research subagents must come from `.codex/config.toml` `[agents.researcher]` and load `.codex/agents/researcher.toml` plus `.codex/agents/researcher.md`. The `architect` agent is reserved for Design and Planning and must not be used for Research, including the Architecture direction. Generic runtime roles such as `worker` or generic `explorer` are not valid substitutes, even when prompted to behave like researchers.
