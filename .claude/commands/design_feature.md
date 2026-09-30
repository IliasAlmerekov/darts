---
description: "Phase 2: create diagram-only design from research, then planning files after human approval"
argument-hint: "<docs/{feature-slug}/research/research.md or feature slug>"
allowed-tools: Read, Write, Glob, Grep, Agent
---

# Design Feature

Use this command after `/research_codebase`.

The active Claude Code chat is the lead orchestrator. Do not create or delegate to a separate lead-orchestrator agent.

## Input

The command receives the research artifact created by the Research phase:

```text
docs/{feature-slug}/research/research.md
```

`$ARGUMENTS` may be either the research file path or the feature slug.

## Required Reads

Before writing design files, read:

- `docs/{feature-slug}/research/research.md`
- `docs/convention/coding-standards.md`
- `docs/repo-map.md` when navigation context is needed

## Subagents

Use the architect subagent only when diagram structure or planning decomposition needs a second pass.

Required subagent model:

- `architect`: `sonnet`

## Design Output

Create:

```text
docs/{feature-slug}/design/design.md
```

The design phase is limited to:

- Data Flow Diagram
- Sequence Diagram

Use Mermaid for both diagrams.

The file may include only:

- Source research file path
- Data Flow Diagram
- Sequence Diagram
- Factual notes needed to interpret the diagrams

Do not include implementation code, file-by-file plan, estimates, alternatives, refactoring advice, or speculative assumptions.

## Human-In-The-Loop Gate

After writing `docs/{feature-slug}/design/design.md`, stop and ask for explicit approval.

Use this message:

```text
Design written to docs/{feature-slug}/design/design.md. Please review and approve before I create planning files.
```

Do not create planning files before the human approves the design.

## Planning After Approval

Only after explicit approval, create:

```text
docs/{feature-slug}/plan/plan.md
```

If the work is large, also create stage files:

```text
docs/{feature-slug}/plan/stage-01.md
docs/{feature-slug}/plan/stage-02.md
```

Split stages when needed to avoid broad, hallucination-prone implementation steps.

Each plan or stage file must include:

- Goal
- Exact allowed file changes
- Files to read before editing
- Implementation steps
- Tests to add or update
- Verification commands
- Security notes
- Rollback notes
- Acceptance criteria

End by telling the user which planning files were created.
