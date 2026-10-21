# State (Nanostores)

Rules for shared state in `src/shared/store/`. Check them against `src/shared/store/`
before changing.

## Layout

```
src/shared/store/
  game-session.ts          # internal atoms + public surface in one file
  game-session.test.ts
  game-state.ts
  game-state.test.ts
  index.ts                 # barrel: re-exports every domain
```

Each domain is one file: its mutable atoms are module-scoped `const`s next to the public
surface, never exported. A new domain gets its own file and an `export *` line in
`index.ts`; update this section when you add one.

## Atom anatomy

Each store domain has three layers:

```ts
// 1. Internal mutable atom (not exported)
const currentGameIdAtom = atom<number | null>(null);

// 2. Public readable atom (exported, $-prefixed, ReadableAtom-typed)
export const $currentGameId: ReadableAtom<number | null> = currentGameIdAtom;

// 3. Action function (the only way to mutate)
export function setCurrentGameId(gameId: number | null): void {
  currentGameIdAtom.set(gameId);
}
```

Rules:

- The `ReadableAtom<T>` annotation on the public export is **required**. It strips
  `.set()` from the type, so `$currentGameId.set(...)` outside the store file fails to
  typecheck. Never cast that typing away.
- Mutable atoms (the bare `xAtom` form) are never exported.
- All writes go through action functions exported from the same file. `<name>Atom.set(...)`
  appears only inside the store file that declares the atom.
- Persist side effects (sessionStorage, listeners) belong in the action, not the caller.
  See `setCurrentGameId` in `game-session.ts`.

## Naming

| Concept            | Form                                     | Example                                              |
| ------------------ | ---------------------------------------- | ---------------------------------------------------- |
| Internal mutable   | `<name>Atom` (camelCase, no prefix)      | `currentGameIdAtom`, `gameDataAtom`, `errorAtom`     |
| Public readable    | `$<name>` (`$` prefix)                   | `$currentGameId`, `$gameData`, `$invitation`         |
| Computed atom      | `$<name>` (`$` prefix, same as readable) | `$gameSettings`                                      |
| Action function    | verb-first, imperative, named by intent  | `setGameData`, `resetRoomStore`, `resetGameStore`    |
| Pure read function | verb-first, returns plain value          | `getCachedGameSettings(gameId)`, `getActiveGameId()` |

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
  closure. Use `useStore($atom)` and let the subscription drive memo deps.
- Returning JSX whose values came from `.get()` instead of `useStore` -- the component
  will not re-render on store changes.
- Subscribing to both a base atom and a `computed` derived from it in the same component
  (e.g. `useStore($gameData)` + `useStore($gameSettings)`, where the latter is
  `computed(gameDataAtom, ...)`). Pick one.

## Computed atoms

Use `computed(...)` for any value that is a pure function of other atoms:

```ts
export const $gameSettings = computed(gameDataAtom, (gameData) => ...);
```

Subscribe to the `computed` directly via `useStore`; do not recompute its output in
component memoization.

## Cache atoms

Per-id caches must have a **bounded** shape. Two accepted forms:

- Single-slot cache (`{ id, value } | null`), replaced atomically. Example: the internal
  `gameSettingsByGameIdAtom` in `game-state.ts` keeps the latest entry only, read through
  `getCachedGameSettings(gameId)`.
- Bounded `Map`/`Record` with explicit eviction, the policy living next to the atom in the
  store file.

An unbounded `Record<id, data>` cache that grows on every fetch is forbidden.

## Error atoms

An error atom is cleared **only** by:

1. The success branch of the operation that set it (`setGameData` clears `errorAtom`, as
   the success counterpart of `setError`),
2. a dedicated clearer named for the action, or
3. the domain reset (`resetGameStore`).

Unconditional `errorAtom.set(null)` from unrelated code paths or effects is forbidden.

## When to use a store

Nanostores is for **cross-page** client state: current game id, invitation, room state.

Data read from the server lives in the TanStack Query cache, not in a store
([ADR 0001](../adr/0001-tanstack-query-for-server-reads.md)). The authenticated user is
server data and lives under the `['auth', 'me']` query key. Do not add new server data
to Nanostores.

Promote component state to a store only when two unrelated pages need it.

## Test patterns

- Assert on store state with `expect($atom.get()).toBe(...)`.
- Do not `vi.spyOn($atom, "set")`: public atoms are `ReadableAtom` and have no `.set` in
  their type. Assert on observable behavior (rendered output, final store state) instead.
- Reset between tests with the public reset actions (`resetGameStore`, `resetRoomStore`).
- Test fixtures follow the `*.test-support.ts` rule in `architecture.md`.

## Verification

ESLint and TypeScript catch most violations because `ReadableAtom` removes `.set` from
the public type. This check covers the case where someone bypasses that typing with an
`as` cast -- `.set()` on a `$`-atom outside `src/shared/store/`:

```bash
rg -n '\$[A-Za-z_]\w*\.set\(' src --glob '!src/shared/store/**'
```

A clean run prints nothing.
