# Phase 01: Hook Fix and Tests
**Layer:** pages/GamePage
**Depends on:** none
**Can be tested in isolation:** Yes — pure function, no React environment needed

## Goal

Remove the `$invitation` store fallback from the `gameId` useMemo in `useGameLogic.ts` and cover the resolution logic with unit tests.

## Files to MODIFY

### src/pages/GamePage/useGameLogic.ts
**Confirmed at:** research.md — lines 62–66

Changes:

**ADD export:** `parseGameIdParam(gameIdParam: string | undefined): number | null`

Extract the URL-param-to-number resolution into an exported pure function. Place it alongside the other exported pure functions (`areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary`) before the `useGameLogic` hook body.

Logic:
- If `gameIdParam` is `undefined` or empty → return `null`
- Parse with `Number(gameIdParam)`
- If `Number.isFinite(parsed)` → return `parsed`
- Otherwise → return `null`
- No fallback to any store at any point

**MODIFY:** `useGameLogic` hook — the `gameId` useMemo block (lines 62–66)

Replace:
```typescript
const gameId = useMemo(() => {
  if (!gameIdParam) return invitation?.gameId ?? null;
  const parsed = Number(gameIdParam);
  return Number.isFinite(parsed) ? parsed : (invitation?.gameId ?? null);
}, [gameIdParam, invitation?.gameId]);
```

With:
```typescript
const gameId = useMemo(() => parseGameIdParam(gameIdParam), [gameIdParam]);
```

The `invitation` local variable (from `useStore($invitation)`) remains — it is used by `handleExitGame` via `setInvitation`. Do not remove it.

DO NOT CHANGE:
- `import { $invitation, setInvitation, resetRoomStore } from "@/store"` — remains unchanged
- `const invitation = useStore($invitation)` — remains unchanged
- `handleExitGame` — untouched
- All other exports: `areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary`
- All other hook logic after line 68

---

### src/pages/GamePage/useGameLogic.test.ts
**Confirmed at:** research.md — test file co-located, `// @vitest-environment node`

Changes:

**ADD import:** `parseGameIdParam` to the existing import from `"./useGameLogic"`.

**ADD describe block:** `parseGameIdParam` — place after existing `shouldNavigateToSummary` describe block.

DO NOT CHANGE:
- `// @vitest-environment node` pragma
- `buildGameData` factory
- All existing `describe` blocks: `areAllPlayersAtStartScore`, `shouldAutoFinishGame`, `shouldNavigateToSummary`

## Tests for This Phase

Test file: `src/pages/GamePage/useGameLogic.test.ts`

| Test case | Condition | Expected output | Mocks needed |
|-----------|-----------|----------------|--------------|
| should return null when gameIdParam is undefined | `gameIdParam = undefined` | `null` | none (pure function) |
| should return null when gameIdParam is an empty string | `gameIdParam = ""` | `null` | none |
| should return null when gameIdParam is a non-numeric string | `gameIdParam = "abc"` | `null` | none |
| should return null when gameIdParam is a float string that is not finite | `gameIdParam = "Infinity"` | `null` | none |
| should return the parsed number when gameIdParam is a valid integer string | `gameIdParam = "42"` | `42` | none |
| should return the parsed number when gameIdParam is "1" | `gameIdParam = "1"` | `1` | none |

Note: `Number("Infinity")` passes `Number.isFinite()` check — it returns `false` for `Infinity`, so "Infinity" string → `null`. Verify this in implementation.

## Verification Commands

1. `npm run typecheck`
2. `npm run eslint`
3. `npm run test -- --reporter=verbose src/pages/GamePage/useGameLogic.test.ts`
4. `npm run test`
5. `npx prettier --check .`

## Done Criteria

- [ ] `parseGameIdParam` exported from `useGameLogic.ts`
- [ ] `useMemo` in `useGameLogic` uses `parseGameIdParam(gameIdParam)` with `[gameIdParam]` as deps
- [ ] `invitation` local variable still present (not removed)
- [ ] `$invitation` import unchanged
- [ ] All 6 test cases written and passing
- [ ] All verification commands pass
- [ ] No other files modified

## Human Review Checkpoint

Before closing this phase:
- [ ] `invitation?.gameId` removed from `useMemo` deps array?
- [ ] `invitation` local variable still declared (required by `handleExitGame`)?
- [ ] `parseGameIdParam` is a pure function — no store reads inside it?
- [ ] Test file pragma `// @vitest-environment node` preserved?
- [ ] Layer boundaries respected — no new imports added?
