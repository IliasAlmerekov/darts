# Implementation Plan: ESLint Config Global Ignores

**Date:** 2026-03-06  
**Design:** Skipped for this task. Planning relies on `docs/eslint-config-global-ignores/research/research.md` as the primary input artifact.  
**Research:** `docs/eslint-config-global-ignores/research/research.md`

## Summary

This task is a lint-configuration stabilization task. Research shows that the repository already has a standalone top-level `ignores` object at the start of `eslint.config.mjs`, which matches the requested target state, while the originally described broken state was `NOT FOUND`. The plan therefore treats the implementation as a targeted reconciliation task: preserve or restore the intended config structure if it has drifted since research, and add regression coverage so the flat-config shape does not silently regress.

## Phase Overview

| #   | Phase name                                 | Layer     | New files | Modified files | Complexity |
| --- | ------------------------------------------ | --------- | --------- | -------------- | ---------- |
| 01  | Config reconciliation and regression guard | repo/test | 1         | 0-1            | Low        |
| 02  | Full repository validation rerun           | repo      | 0         | 0              | Low        |

## Dependency Order

- Phase 01 has no dependencies.
- Phase 02 depends on Phase 01.

## Research Facts Driving the Plan

- [F1] Research requires planning to use `research.md` as the primary input when Design is skipped.
- [F2] The ESLint flat config array already starts with a standalone ignore object.
- [F3] The standalone ignore object already contains the requested patterns.
- [F4] The main TypeScript/TSX config block begins later and does not show the task's broken nested global `ignores` state.
- [F5] A later `src/shared` override uses scoped `ignores`, which must not be conflated with the top-level global ignore object.
- [F6] The repository currently has no explicit automated test that locks the ESLint flat-config ignore shape.
- [F7] Vitest only includes `src/**/*.test.{ts,tsx}`, so any new unit-level regression test must live under `src/`.
- [F8] Mandatory final validation commands are `npm run eslint`, `npm run stylelint`, `npm run test`, `npm run typecheck`, `npx prettier --check .`, and `npm run test:e2e`.

## Scope

- Reconcile `eslint.config.mjs` with the approved target state only if the file has diverged from the researched baseline by the time implementation starts.
- Add a regression test under `src/` that locks the intended flat-config structure:
  - the first exported config item is the standalone global ignore object,
  - the global ignore patterns match the approved list,
  - the main TypeScript/TSX block does not own those global ignore patterns,
  - the later `src/shared` override retains its scoped ignore list.
- Run the mandatory repository validation suite after the targeted work is complete.

## Non-Goals

- No changes to application runtime behavior.
- No changes to route configuration, UI, stores, or feature logic.
- No change to the existing `src/shared` scoped ignore override unless it is required to preserve the current researched behavior.
- No expansion of Vitest include patterns unless the planned `src/` test location proves impossible during implementation and a blocker is documented.

## Risks

- [R-001] Research and implementation-time repository state may differ; the worker must re-open `eslint.config.mjs` before editing and stop if the file has changed in a way that widens scope.
- [R-002] A structural regression test may lock the current config shape without executing ESLint against ignored paths; the implementation must keep this limitation explicit in phase reporting.
- [R-003] If importing `eslint.config.mjs` from a `src/**/*.test.ts` file proves incompatible with the current Vitest setup, the phase must stop with a documented blocker rather than widening scope silently.

## Accessibility and Security Constraints

- This task does not change interactive UI, but any added test names and assertions should remain clear and readable for future maintenance.
- Do not add secrets, credentials, or unsafe logs while testing configuration behavior.
- Keep the implementation limited to configuration and regression coverage only.
