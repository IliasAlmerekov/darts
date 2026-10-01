# Darts App (frontend)

PWA darts game: rooms, SSE live throws, player statistics. React 18, TypeScript, Vite,
Nanostores, CSS Modules. Backend lives in a separate repository; its API contract is
`docs/backend-api-contract.json`.

## Before changing code

Read `docs/convention/coding-standards.md`, then every domain file its table maps to your
change. The conventions win over current code: fix the code, keep the rule. A domain the
table lacks is undocumented, so ask the user before deciding it.

For navigation, start at `docs/repo-map.md`.

For library APIs (React, React Router, Nanostores, Vitest, Testing Library, Playwright,
Vite), query Context7 before writing code.

## Tickets

When a ticket names its source-of-truth files, read only those. When it asks for a
literal-value inventory, take every member from the named source; a member the source
lacks stays missing.

## Verification

`npm run validate:push` runs build, lint, prettier, typecheck, secret scan and unit tests;
the `pre-push` hook runs the same script. Run `npm run test:e2e` as well when the change
touches browser flows, routing, auth, responsive layout, or a Playwright-covered journey.

A fresh clone has no `node_modules`: run `npm install` first, or the hook fails.

## Guardrails

Ask the user first before you:

- add, remove, or upgrade a dependency;
- touch auth, validation, CSRF, roles, tokens, or credentials;
- run a destructive command.

Keep `.env` values out of prompts, logs, commits, and issues. Work on a branch; `main`
changes only through a merge request. Commits carry the human author only, with no
`Co-Authored-By` trailer.
