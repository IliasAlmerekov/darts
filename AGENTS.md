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

`npm run validate:push` runs build, ESLint, Stylelint, prettier, typecheck, knip, secret scan
and unit tests; the `pre-push` hook runs the same script. Run `npm run test:e2e` as well when
the change touches browser flows, routing, auth, responsive layout, or a Playwright-covered journey.

A fresh clone has no `node_modules`: run `npm install` first, or the hook fails.

## Commits and pull requests

Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):
`<type>(<scope>): <description>`. The `commit-msg` hook checks them with commitlint, and
`commitlint.config.mjs` lists the allowed types. A breaking change marks the type with `!`
and adds a `BREAKING CHANGE:` footer.

Every PR body is the filled `.github/pull_request_template.md`, whoever opens the PR:

1. Copy the template to a file, fill it in, and pass it with `gh pr create --body-file <file>`.
2. Keep four parts, in this order:
   - `Closes #N`. Write `No issue: <reason>` instead only when `CONTRIBUTING.md` allows a PR without an issue.
   - What changed and why, in 1 or 2 sentences.
   - `Evidence:` bullets, each a command and its result, or a test that failed before the fix and passes after.
   - `Confidence:` high, medium, or low, plus one sentence on the risk left.
3. Delete the template's `<!-- -->` comments. The body has at most 10 non-empty lines.

The diff already shows files and changes, so the body carries only the four parts. Session
notes, verification detail, follow-ups, and benchmarks go in a comment on the issue. Close the
issue once its acceptance criteria are met and that comment carries the verification.

Commits, PR titles and bodies, and issue comments carry the human author only: no
`Co-Authored-By` trailer and no Claude or agent footer.

## Guardrails

Ask the user first before you:

- add, remove, or upgrade a dependency;
- touch auth, validation, CSRF, roles, tokens, or credentials;
- run a destructive command.

Keep `.env` values out of prompts, logs, commits, and issues. Work on a branch; `main`
changes only through a merge request.
