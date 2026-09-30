---
description: "Small/medium change workflow using tests first or tests alongside implementation"
argument-hint: "<task description>"
allowed-tools: Read, Write, Edit, MultiEdit, Glob, Grep, Bash, Agent
---

# Test Driven Development

Use this command for small or medium changes that do not need the full research, design, and planning workflow.

The active Claude Code chat is the lead orchestrator. Do not create or delegate to a separate lead-orchestrator agent.

## Input

- User task: `$ARGUMENTS`

## Required Reads

Before editing code, read:

- `docs/convention/coding-standards.md`
- Relevant existing tests and implementation files

Use `explorer` with model `haiku` only when file discovery is unclear.

## Workflow

1. Identify the smallest observable behavior.
2. Add or update a focused failing test when practical.
3. Implement the smallest production change that satisfies the test.
4. Run targeted tests.
5. Expand tests only for real edge cases introduced by the change.
6. Run formatter, linter, and broader verification commands appropriate to the touched files.

## Subagent Models

Use subagents only when they materially reduce risk:

- `explorer`: `haiku`
- `tester`: `sonnet`
- `security`: `sonnet`
- `reviewer`: `sonnet`

## Final Output

Report:

- Plan
- Patch summary
- Commands run and results
- Brief rationale
