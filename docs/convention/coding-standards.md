# Coding Standards

Source-of-truth for code style, architecture, and conventions in this project.
Each file in this folder describes **one domain**. Load only the file(s) relevant to the
task at hand -- the table below maps tasks to files.

## External contracts

Backend API contract source-of-truth:
[`docs/backend-api-contract.json`](../backend-api-contract.json).

Use `docs/convention/api.md` for frontend API conventions. Do not maintain hand-written
endpoint inventories as a competing source of truth.

## Domains

| File                               | Domain                                                                 | Load when...                                                                      |
| ---------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [architecture.md](architecture.md) | folder layout, dependency rule, module boundaries, routing, aliases    | adding/moving files, changing imports, touching `App.tsx`, adding/changing routes |
| [typescript.md](typescript.md)     | type safety, forbidden constructs, `as` policy, type guards, env vars  | writing or changing any TS code                                                   |
| [state.md](state.md)               | Nanostores: atoms, actions, reactive vs imperative reads               | touching `src/shared/store/` or any consumer (`useStore` / `$atom.get()`)         |
| [api.md](api.md)                   | `apiClient` + `validate`, typed errors, mappers, ETag, error-to-user   | adding/changing API calls, mappers, error handling, or anything in `shared/api/`  |
| [react.md](react.md)               | components, memo, refs, hooks, effects, lists, routing-side components | writing or changing any component, hook, `useEffect`, or routing helper           |
| [styling.md](styling.md)           | CSS Modules, global tokens, `clsx`, responsive CSS, inline styles      | writing or changing CSS, class names, `className`, or style props                 |
| [errors.md](errors.md)             | error classes, catch handling, route errors, user-safe messages        | throwing, catching, logging, displaying, or mapping errors                        |
| [testing.md](testing.md)           | Vitest, Testing Library, Playwright structure, mocks, coverage         | adding/changing tests, test helpers, mocks, fixtures, or E2E specs                |

## Rules for agents

1. **Read first.** Before changing code, load the file(s) for the affected domain(s)
   from the table above.
2. **The convention wins.** If a rule conflicts with current code, fix the code (or file
   an issue) -- do not weaken the rule.
3. **No invention.** If your task touches a domain not listed in the table, the
   convention is not yet documented -- ask the user before deciding anything.
4. **Verify after change.** Each domain file ends with a `## Verification` block. Run
   those commands for every file you touched.

## Domains not yet written

These are planned and will be added file-by-file. Until a file exists, treat the domain
as undocumented (rule 3 applies):

- `logging.md` -- `clientLogger`, redaction
- `performance.md` -- `AbortController`, prefetch gating, lazy loading
- `naming.md` -- file, symbol, type naming
- `tooling.md` -- verification commands, pre-push hook, conventional commits
