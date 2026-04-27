# AGENTS.md — Darts App Context

## Source Of Truth

Before implementing any change, agents **must** read and follow the rules in
[`docs/convention/coding-standards.md`](docs/convention/coding-standards.md).

`AGENTS.md` is context-only. It does not define coding rules, exceptions, quality gates,
or additional process requirements. If anything in this file differs from or extends the
coding standards, ignore this file and follow the coding standards.

## Project

PWA darts game with room creation, SSE real-time throw streaming, and player statistics.

For fast navigation, start with [`docs/repo-map.md`](docs/repo-map.md). It is
context-only and does not define coding rules.

## Documentation

When unsure about the API or behavior of any library in this project, fetch up-to-date docs
via Context7 before writing code:

```text
mcp__context7__resolve-library-id -> mcp__context7__query-docs
```

Use this for React, React Router, Nanostores, Vitest, Testing Library, Playwright, Vite,
TypeScript, and any other dependency where API accuracy matters.

## Hard Safety Rules

Agents must not:

- Read production secrets.
- Paste `.env` values into prompts, logs, commits, or issue comments.
- Push directly to `main`.
- Add `Co-Authored-By:` (or `Co-authored-by:`) trailers to commit messages, PR
  descriptions, or any other git metadata. Commits are authored by the human
  developer only.
- Disable auth, validation, CSRF, or authorization checks.
- Change permissions, roles, tokens, credentials, or access policy without human approval.
- Run destructive commands without human approval.
- Install random packages or change dependencies without a clear reason and human approval.
- Create, edit, or run database migrations without human approval.
- Send code, logs, traces, secrets, or project files to external services without explicit
  permission.

## Tech Stack

- Runtime/UI: React 18
- Language: TypeScript 5.8
- Build: Vite 7
- Routing: React Router 6
- State: Nanostores
- Styling: CSS Modules
- Testing: Vitest, Testing Library, Playwright

## Project Structure

```text
src/
  app/         # bootstrap, providers, router, global guards, error boundaries
  assets/      # static assets imported by code
  pages/       # route-level components
  shared/      # api client, utilities, hooks, types, shared UI kit
  test/        # test-only helpers, architecture tests, Vitest setup
  index.tsx    # app entry
  vite-env.d.ts
```

This is a pages-based layout. The authoritative `src/` layout is defined in
`docs/convention/architecture.md`.

## Verification Commands

Repository validation is enforced by the pre-push hook via `npm run validate:push`.
The standard local commands are:

```bash
npm run build
npm run eslint
npm run stylelint
npm run prettier:check
npm run test
npm run typecheck
npm run secrets:check
```

Run `npm run test:e2e` when touching browser flows, routing, auth, responsive behavior, or
Playwright-covered user journeys.

## Workflow Context

The repository documents a multi-phase workflow for non-trivial changes. Artifact paths and
process details should be taken from the coding standards and repository docs, not inferred
from this file.

## Multi-Agent Workflow Orchestration

For the `.codex` multi-agent workflow, the active chat agent is the lead orchestrator.
Do not create, register, or delegate to a separate `lead_orchestrator` or
`lead-orchestrator` subagent.

The active chat agent owns phase sequencing, artifact handoff, Human-in-the-Loop gates,
cycle limits, and subagent dispatch. Project-local subagents under `.codex/agents/` are
specialized workers only: `researcher`, `architect`, `coder`, `tester`, `security`,
`reviewer`, and `explorer`.

## Ticket-Driven Source Of Truth

- If a ticket limits the source of truth to a specific file list, use only those files.
- If a ticket requires literal-value inventory before implementation, do not infer missing
  members from the ticket text or from other files.
