# Implementation Plan: Fix Vitest Environment

**Date:** 2026-03-05
**Research:** docs/fix-vitest-environment/research.md

## Summary

Change the default Vitest environment in `vite.config.ts` from `"node"` to `"jsdom"` so component tests
using React Testing Library run in a DOM environment by default. Because 15 pure-function/API test files
currently rely on the `"node"` default, add `// @vitest-environment node` as the first line of each to
maintain correct isolation and avoid unnecessary jsdom overhead. Also trim the `include` pattern to remove
the unused `.spec.` glob (no `.spec.*` files exist in `src/`).

## Phase Overview

| #   | Phase name           | Layer          | New files | Modified files | Complexity |
| --- | -------------------- | -------------- | --------- | -------------- | ---------- |
| 01  | Config and docblocks | config + tests | 0         | 16             | Low        |

## Dependency Order

Single phase — no dependencies.

## Conventions Confirmed from Research

- Default environment currently `"node"` — `vite.config.ts:38`
- 30 DOM test files already annotated with `// @vitest-environment jsdom` — no changes needed
- 15 pure/node test files have no docblock — confirmed absence via grep
- No `setupFiles`, no separate `vitest.config.ts` — confirmed absent
- `include` currently contains unused `.spec.{ts,tsx}` glob — no spec files exist in `src/`

## Open Questions

NONE

## Risks

- [R-001] A test file classified as "pure node" may actually use DOM globals indirectly (e.g., via a transitive import). Mitigation: `npm run test` after Phase 01 will reveal any broken tests immediately; fix by removing the `// @vitest-environment node` docblock from that file.
