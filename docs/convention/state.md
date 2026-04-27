# State (Nanostores)

Rules for shared state in `src/shared/store/`. Source-of-truth: must be checked against
`src/shared/store/` before changing.

## Layout

```
src/shared/store/
  auth.ts                  # public surface: $readable atoms + action functions
  auth.state.ts            # internal mutable atoms (this file is private to auth.ts)
  auth.test.ts             # co-located unit tests
  auth.test-support.ts     # test-only helpers
  game-session.ts          # combined: internal atoms + public surface in one file
  game-session.test.ts
  game-state.ts            # combined layout
  game-state.test.ts
  index.ts                 # barrel: re-exports public surface from each domain
```

Two file layouts coexist and both are accepted:

- **Split** (`auth.ts` + `auth.state.ts`): mutable atoms live in `*.state.ts`; the public
  module imports them and never re-exports them.
- **Combined** (`game-state.ts`, `game-session.ts`): mutable atoms are declared as
  module-scoped `const`s inside the same file as the public surface, never exported.

Pick whichever the existing domain already uses. Adding a new file requires updating this
section.

## Atom anatomy

Each store domain has three layers:

```ts
// 1. Internal mutable atom (not exported)
const userAtom = atom<AuthenticatedUser | null>(null);

// 2. Public readable atom (exported, $-prefixed, ReadableAtom-typed)
export const $user: ReadableAtom<AuthenticatedUser | null> = userAtom;

// 3. Action function (the only way to mutate)
export function setAuthenticatedUser(user: AuthenticatedUser | null): void {
  userAtom.set(user);
  authErrorAtom.set(null);
  authCheckedAtom.set(true);
}
```

Rules:

- The `ReadableAtom<T>` annotation on the public export is **required**. It strips
  `.set()` from the type, so `$user.set(...)` outside the store file fails to typecheck.
- Mutable atoms (the bare `xAtom` form) are never exported.
- All writes go through action functions exported from the same file.

## Naming

| Concept            | Form                                     | Example                                           |
| ------------------ | ---------------------------------------- | ------------------------------------------------- |
| Internal mutable   | `<name>Atom` (camelCase, no prefix)      | `userAtom`, `gameDataAtom`, `errorAtom`           |
| Public readable    | `$<name>` (`$` prefix)                   | `$user`, `$gameData`, `$lastFinishedGameId`       |
| Computed atom      | `$<name>` (`$` prefix, same as readable) | `$gameSettings`, `$lastFinishedGameId`            |
| Action function    | verb-first, imperative                   | `setGameData`, `clearAuthError`, `resetGameStore` |
| Pure read function | verb-first, returns plain value          | `getCachedGameSettings(gameId)`                   |

## Reading

Two read paths coexist deliberately:

- **`useStore($atom)`** -- reactive subscription. Use it whenever the read result drives
  rendering or memoized derivation in a component or hook top-level.
- **`$atom.get()`** -- imperative one-shot snapshot. Use it inside event handlers, async
  callbacks, queue processors, route loaders, and effect bodies that compare-then-decide.

Same hook can use both:

```ts
function useGameState({ gameId }) {
  const gameData = useStore($gameData); // render-driving
  useEffect(() => {
    if ($gameData.get()?.id !== gameId) resetGameStore(); // imperative compare
  }, [gameId]);
}
```

Forbidden:

- `$atom.get()` inside `useMemo` -- it produces a stale snapshot bound to the memo
  closure. Use `useStore($atom)` and let the reactive subscription drive memo deps.
- Returning JSX whose values came from `.get()` instead of `useStore` -- the component
  will not re-render on store changes.
- Subscribing to both a base atom and a `computed` derived from it in the same component
  (e.g. `useStore($gameData)` + `useStore($gameSettings)` where the latter is
  `computed(gameDataAtom, ...)`). Pick one.

## Writing

- The only legal place for `<name>Atom.set(...)` is **inside the same store file** that
  declares the atom. Action functions live there.
- Outside the store file, `$atom.set(...)` is a type error and must stay one. Do not
  cast away the `ReadableAtom` typing.
- Action functions are the API: name them by intent (`setGameData`, `invalidateAuthState`)
  and keep them in the public surface file (`auth.ts`, not `auth.state.ts`).
- Persist side effects (sessionStorage, listeners) belong in the action, not the caller.
  See `setCurrentGameId` in `game-session.ts` for the pattern.

## Computed atoms

Use `computed(...)` for any value that is a pure function of other atoms:

```ts
export const $gameSettings = computed(gameDataAtom, (gameData) => gameData?.settings ?? null);
```

- A `computed` atom uses the `$` prefix like a readable atom -- it has no `.set()`.
- Do not duplicate `computed` outputs in component memoization. Subscribe to the
  `computed` directly via `useStore`.

## Cache atoms

Per-id caches must have a **bounded** shape. Two accepted forms:

- Single-slot cache (`{ id, value } | null`) -- replaced atomically. Example:
  `$gameSettingsByGameId` in `game-state.ts` keeps the latest one entry only.
- Bounded `Map`/`Record` with explicit eviction. If you need this, the eviction policy
  must live next to the atom in the store file.

An unbounded `Record<id, data>` cache that grows on every fetch is forbidden.

## Error atoms

- An error atom is cleared **only** by:
  1. The success branch of the operation that originally set it
     (`setGameData` clears `errorAtom`, since it is the success counterpart of
     `setError`), or
  2. A dedicated clearer named for the action (`clearAuthError`).
- Unconditional `errorAtom.set(null)` from unrelated code paths or effects is forbidden.

## When to use a store

Nanostores is for **cross-page** or **truly shared** state -- auth session, current
game id, game data the player is currently in, etc.

Local UI state (open/closed toggles, form inputs, hover state, ephemeral selection)
stays in `useState` inside the component. Do not promote local state to a store unless
two unrelated pages need it.

## Test patterns

- Unit tests assert via `expect($atom.get()).toBe(...)`. This is fine -- imperative reads
  in tests are the convention.
- Do not `vi.spyOn($atom, "set")`. Atoms are exported as `ReadableAtom` and have no `.set`
  in the public type. Spy on observable behavior (rendered output, store final state) instead.
- Test-only seed/reset helpers live in `<name>.test-support.ts` (see
  `auth.test-support.ts`). They may import the internal mutable atoms via the same
  module structure as the public surface uses.
- `*.test-support.ts` files must be imported **only** from test files (`*.test.ts`,
  `*.test.tsx`). Importing them from production code is forbidden -- it would pull
  test-only fixtures into the runtime bundle.

## Verification

ESLint and TypeScript catch most violations because `ReadableAtom` removes `.set` from
the public type. Three extra checks for things types do not enforce:

**1. No `.set()` on `$`-atoms outside `src/shared/store/`** -- this guards against the
case where someone bypasses the `ReadableAtom` typing via `as` casts:

```bash
rg -nP '\$[A-Za-z_][\w]*\.set\(' src --glob '!src/shared/store/**'
```

**2. No imports of `*.state` modules outside `src/shared/store/`** -- internal mutable
atoms must be reached only through the public surface file in the same store domain:

```bash
rg -nP "from ['\"][^'\"]*\.state['\"]" src --glob '!src/shared/store/**'
```

**3. No imports of `*.test-support` modules outside test files** -- prevents test-only
fixtures from leaking into production bundles:

```bash
rg -nP "from ['\"][^'\"]*\.test-support['\"]" src --glob '!**/*.test.{ts,tsx}'
```

A clean run of all three prints nothing.
