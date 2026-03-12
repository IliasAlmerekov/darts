# Darts App — Project Context

## Source Of Truth

Before implementing any change, agents **must** read and follow the rules in
[`docs/audit/checklist.md`](docs/audit/checklist.md).

`CLAUDE.md` is context-only. It does not define coding rules, exceptions, or additional
requirements. If guidance in this file appears to conflict with the checklist, ignore this
file and follow the checklist.

## Project

PWA darts game: room creation, SSE real-time throw streaming, player statistics.

## Documentation

When unsure about the API or behavior of any library in this project, fetch up-to-date docs
via Context7 before writing code:

```
mcp__context7__resolve-library-id -> mcp__context7__query-docs
```

Use this for React, React Router, Nanostores, Vitest, Testing Library, Playwright, Vite,
TypeScript, and any other dependency where API accuracy matters.

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
  app/      # bootstrap, providers, router, global guards, error boundaries
  pages/    # route-level components
  shared/   # api client, utilities, hooks, types, shared UI kit
```

This is a pages-based layout. The authoritative folders are `app`, `pages`, and `shared`.

## Verification Commands

Repository validation is enforced by the pre-push hook. The standard commands are:

```bash
npm run build
npm run eslint
npm run stylelint
npm run prettier:check
npm run test
npm run typecheck
npm run secrets:check
npm run test:e2e
```

## Workflow Context

The repository documents a 4-phase workflow for non-trivial changes:
research, design, plan, implement. Artifact paths and process details should be taken from the
checklist and repository docs, not inferred from this file.

## Ticket-Driven Source Of Truth

- If a ticket limits the source of truth to a specific file list, use only those files.
- If a ticket requires literal-value inventory before implementation, do not infer missing
  members from the ticket text or from other files.
