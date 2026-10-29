# API

Rules for the HTTP layer in `src/shared/api/`, the query layer in `src/shared/query/`, and
DTO -> UI mapping in `src/shared/lib/<domain>/`.

A cached server read passes through three layers:

1. `src/shared/api/<domain>.ts`: calls `apiClient` and returns the parsed response.
2. `src/shared/query/<domain>.queries.ts`: wraps the domain function in a cache entry.
3. Route loaders, page hooks, and components: read the cache entry.

A read inside an imperative workflow (a loader that fills Nanostores, a submit handler, a
recovery after a failed patch) calls the domain function directly and skips the cache. The
call sites today:

- `src/pages/StartPage/startPageLoader.ts`: `getGameThrows` and `getInvitation` in the
  StartPage loader.
- `src/pages/StartPage/useCreateStartFlow.ts`: `getGameSettings` before a game starts.
- `src/pages/LoginPage/useLogin.ts`: `getAuthenticatedUser` in the post-login session
  fallback, before it seeds the cache.
- `src/pages/GameSummaryPage/useGameSummaryPage.ts`: `getGameThrows` when a compact undo
  response cannot patch local state.
- `src/pages/GamePage/useGameSession.ts`: `getGameThrows` after the server rejects a queued
  throw or undo.

A read that renders on its own, without such a workflow around it, goes through a query
factory.

## Layout

```
src/shared/api/
  client.ts            # apiClient + ApiValidationError + setUnauthorizedHandler
  errors.ts            # typed error classes
  endpoints.ts         # cross-domain endpoints only (currently: createInviteEndpoint)
  schemas.ts           # Valibot schemas shared by 2+ domain files, integerSchema
  types.ts             # apiClient types (HttpMethod, ApiRequestConfig, QueryParams)
  index.ts             # barrel: cross-cutting public surface
  test-utils.ts        # createMockResponse and respondWith helpers for tests
  auth.ts              # auth flows, DTO types
  game.ts              # game flows + ETag cache
  room.ts              # room flows
  statistics.ts        # stats flows
  player.ts            # the player's current game and profile
src/shared/query/
  queryClient.ts       # the one QueryClient and its defaults
  <domain>.queries.ts  # queryOptions factories: auth, game, player, statistics
  acceptLoggedInUser.ts # writes the logged-in user into the auth key
  tabletGameLoader.ts  # loader builder for the admin routes that follow the tablet game
src/shared/lib/auth/
  clearClientSession.ts # drops the query cache, the room store and the game store
```

## Public surface

The API layer has two levels:

- `@/shared/api` (the `index.ts` barrel): `setUnauthorizedHandler`,
  `clearUnauthorizedHandler`, `ApiError`, `UnauthorizedError`, `ForbiddenError`,
  `NetworkError`, `TimeoutError`, plus everything re-exported from `endpoints.ts` and the
  per-domain modules.
- `@/shared/api/<domain>`: the public entry for that domain's DTO types, resource functions,
  and per-domain caches.

`apiClient` stays inside `shared/api/`: only the domain files call it, and the barrel does not
export it. Internals (`client.ts`, `errors.ts`, `types.ts`, `endpoints.ts`, `schemas.ts`) are
never deep-imported from outside `shared/api/`.

## `apiClient`: single gateway

`fetch()` is called in exactly one place: `src/shared/api/client.ts`. Every other network
call goes through `apiClient.{get,post,put,patch,delete,request}`.

- Every call passes `validate`: the Valibot schema of the response body. Calls without it
  are a type error.
- The schema describes the full response shape that `docs/backend-api-contract.json`
  defines. `apiClient` runs `v.safeParse` and returns `v.InferOutput` of the schema. If
  parsing fails, it throws `ApiValidationError` with the raw body in `raw`.
- Forward `AbortSignal` through the optional `signal` config. The client has a built-in 30s
  timeout; add no second one.
- Use `apiClient.request(..., { returnResponse: true })` only when the caller needs the raw
  `Response` (status, headers), as in ETag flows. Otherwise use the helper methods.

## Parse once

`apiClient` parses each response once. The domain function returns the typed output as is:

```ts
return apiClient.get(GAME_ENDPOINT(gameId), {
  ...(signal ? { signal } : {}),
  validate: gameThrowsResponseSchema,
});
```

The result is never re-checked with a guard or widened to `unknown`. When the UI needs
another shape, pass the output to a mapper (see "Mappers").

## Response schemas

ADR 0002 records why responses are described by Valibot schemas.

- Each response read in a domain file has one schema, declared above the resource
  functions as `camelCaseSchema` (`gameThrowsResponseSchema`). Import Valibot as
  `import * as v from "valibot"`.
- The response type is inferred from the schema:
  `export type GameSettingsResponse = v.InferOutput<typeof gameSettingsResponseSchema>`.
  No separate interface. `@/types` re-exports response types that pages use.
- Follow the contract: a required field is required, an optional field is `v.optional`,
  `nullable: true` is `v.nullable`, `integer` is `integerSchema`. A contract `default` goes
  into `v.optional(schema, default)`, so the output type has the field.
- A schema may be narrower than the contract where the contract is untyped (a `status`
  string becomes `v.picklist`). It is never looser.
- Any unvalidated response needs the user's approval and an entry here.
- A discriminant the contract documents is read from the payload like any other field. The
  `type` of `GameResponseDto`, `ThrowAckDto` and `UndoAckDto` has a contract `default`, so it
  is `v.optional(v.picklist([...]), default)`. A schema may still map a parsed response to a
  client-side result with `v.transform` (`loginResponseSchema` in `auth.ts`).
- A schema used by 2+ domain files lives in `schemas.ts`, like a shared endpoint in
  `endpoints.ts`.
- Shared guards in `@/lib/guards/guards` are for code outside the API layer. `shared/api/`
  has no `isXxxResponse` guards.

## Typed errors

All errors thrown by `apiClient` are instances of `ApiError` or its subclasses:

| Class               | Status | When                                                                              |
| ------------------- | ------ | --------------------------------------------------------------------------------- |
| `ApiError`          | n      | Generic non-OK status not covered below                                           |
| `UnauthorizedError` | 401    | Session invalid; triggers global redirect handler unless `skipAuthRedirect: true` |
| `ForbiddenError`    | 403    | Authenticated user lacks permission                                               |
| `NetworkError`      | 0      | `fetch` rejection (no response received)                                          |
| `TimeoutError`      | 0      | Built-in 30s timeout aborted the request                                          |

`ApiValidationError` (in `client.ts`) is a separate class that does not extend `ApiError`.
It is thrown when the body does not match the `validate` schema; `raw` holds the body.

- Throw HTTP failures as `new ApiError(message, { status, data, url })`.
- Catch by class (`error instanceof UnauthorizedError`); branch on `error.status` only when
  you need the numeric value.
- Per-domain data goes into the `data` field of the existing hierarchy, not into a new
  `ApiError` subclass.
- A 429 carries the `Retry-After` header as whole seconds in `retryAfterSeconds`. The value
  comes from a header, not the body, so it has its own field instead of `data`.

## Endpoints

Three forms coexist:

- **Static path constant** at the top of the domain file: `const LOGIN_ENDPOINT = "/login";`
- **Path builder** for path-with-id endpoints: `const GAME_ENDPOINT = (id: number) => ...`
- **Cross-domain shared** in `endpoints.ts`, only for a path that 2+ domain files use
  (currently `createInviteEndpoint`).

Domain endpoints stay inside the domain file until a second domain file needs the path.

## Server reads: TanStack Query

ADR 0001 records why server reads go through TanStack Query. State the client owns (current
game id, room store, game store) stays in Nanostores (`state.md`).

### Factories and keys

- Each domain has one factory object of `queryOptions` builders in
  `src/shared/query/<domain>.queries.ts`: `authQueries`, `gameQueries`, `playerQueries`,
  `statsQueries`. A new read adds a builder there.
- A key is an `as const` array that starts with the domain and ends with the params:
  `["auth", "me"]`, `["game", gameId, "settings"]`,
  `["stats", "players", { limit, offset, sortParam }]`. The one exception is
  `["finishedGame", gameId]` (`FINISHED_GAME_KEY` in `game.queries.ts`).
- Callers take keys and options from the builder (`gameQueries.lobbyPlayers(id).queryKey`,
  `useQuery({ ...gameQueries.finished(id), enabled })`), never from an inline array.
- `queryFn` passes its `signal` to the domain function. On an unexpected failure it logs
  through `clientLogger.error` unless `signal.aborted`, then rethrows. A factory may treat
  failures it expects as quiet branches: `authQueries.me` returns `null` on a timeout or
  abort, and `playerQueries.currentGame` rethrows network, timeout, and 401 errors without
  logging, because it polls.
- When the UI needs another shape, `queryFn` runs the mapper, so the cache holds the mapped
  value (`toLobbyPlayers` in `gameQueries.lobbyPlayers`).
- `queryClient.ts` keeps the old fetch behaviour: no retry, no refetch on focus or
  reconnect, `staleTime: 0`. A builder opts out per query with a comment giving the reason
  (`staleTime: Infinity` for finished games, `refetchInterval` polling in
  `playerQueries.currentGame`).

### Reading

- Data that depends on route params is loaded in the route loader with
  `await queryClient.ensureQueryData(builder)`, and the page hook reads the same builder with
  `useQuery` (`gameDetailLoader` / `useGameDetailPage`). When the page shows its own error
  state, the loader swallows the rejection: `.catch(() => undefined)` (`gamesOverviewLoader`).
- One exception: the admin routes read the tablet game with `queryClient.fetchQuery`, so it
  is fresh on every navigation, and the target of a redirect reuses that read
  (`tabletGameLoader`, `startPageLoader`, [ADR 0004](../adr/0004-tablet-game-from-server.md)).
- Data whose key changes inside the page uses `useQuery` alone (`usePlayerStats`, with
  `placeholderData: keepPreviousData`).
- Prefetch goes through `queryClient.prefetchQuery` (`src/app/routeWarmup.ts`, scheduled by
  `src/app/useStatisticsPrefetch.ts`).
- The query cache is the single source for a server value that only queries hold (the
  authenticated user has no `$user` mirror). The game store is the exception: it holds the
  game state the client owns (ADR 0001), and two queries bridge to it. `gameQueries.settings`
  seeds from `$gameData` or `getCachedGameSettings`, and `gameQueries.lobbyPlayers` seeds from `$gameData`,
  both through `initialData`. `startPageLoader` writes one response to `setGameData` and to
  the lobby players query. The game page's throw queue, optimistic throws, and undo stay outside queries.

### Writing

The project has no `useMutation`. After a write, the caller puts the server's answer in the
cache itself:

- `cancelQueries({ queryKey })`, then `setQueryData(queryKey, value)`, so a read still in
  flight cannot overwrite the new value (`SettingsPage/useGameSettings.ts`, the game page's
  settings save in `GamePage/useGameActions.ts`, `useGamePlayers.ts`,
  `useRegistration.ts` with `acceptLoggedInUser`).
- `removeQueries({ queryKey })` drops an entry the write made invalid (undo and rematch
  in `useGameSummaryPage.ts`).
- `invalidateQueries({ queryKey })` marks a read the write changed on the server when the
  response does not carry its new value. Undo, rematch and room create invalidate
  `gameQueries.tablet()` (`useGameSummaryPage.ts`, `useCreateStartFlow.ts`).
- `useLogout` and the 401 handler call `clearClientSession()` in
  `src/shared/lib/auth/clearClientSession.ts`, which runs
  `queryClient.clear()`: every cached read belongs to the old session.

## Mappers (DTO -> UI)

Mappers are pure functions that turn backend DTO shapes into UI types.

- They live in `src/shared/lib/<domain>/`: `shared/lib/game/` holds `gameStateNormalizer`,
  `mergeGameSettings`, `player-mappers`, `roundAverage`, `parseThrowValue`,
  `finishedGameStandings`, `lobbyPlayers`; `shared/lib/player/` holds `currentGame` and
  `profile`.
- Every mapper has a co-located `*.test.ts`.
- Mappers are called from an API domain function (`getCurrentGame` in `player.ts` calls
  `toCurrentGame`), a `queryFn` in `src/shared/query/` (`playerQueries.profile` calls
  `toPlayerProfile`), a store action (`setGameData(data)`
  calls `normalizeGameData(data)`), or a page-private logic file under `src/pages/<Page>/lib/`.
- JSX files (`src/pages/**/*.tsx`) and render-flow hooks (`src/pages/**/use*.ts`) receive the
  mapped result and import no mapper. Type imports are fine. Known exceptions:
  - `startPageLoader.ts` imports `toLobbyPlayers` and `useGamePlayers.ts` imports
    `sortLobbyPlayers`; #194 decides them.
  - `useGameSummaryPage.ts` (`applyOptimisticUndo`) calls a mapper inside an event handler.
    `eslint.config.mjs` ignores this file as existing debt.

## ETag / conditional fetches

`getGameThrowsIfChanged` in `game.ts` is the pattern; a new domain with conditional fetches
mirrors it:

- A per-id version map (`gameStateVersionById = new Map<number, string>()`) lives
  module-scoped in the domain file.
- Send `If-None-Match` + `query: { since }`, accept 304 via `acceptedStatuses: [304]`, read
  headers via `returnResponse: true`.
- `setGameStateVersion(gameId, version)` / `resetGameStateVersion(gameId?)` let store
  actions and hooks manage the cache key.

## Error -> user message

User-facing messages come from `toUserErrorMessage(error, fallback?)` in
`src/shared/lib/error/error-to-user-message.ts`; `errors.md` has the rules.

## Test patterns

- Build mock `Response` objects with `createMockResponse({ body, headers, status, url })`
  from `src/shared/api/test-utils.ts`.
- API domain tests mock `apiClient.{get,post,...}`, not `fetch`. The single fetch in
  `client.ts` is exercised by `client.test.ts`.
- Mock an `apiClient` method with `respondWith(payload)` from `test-utils.ts`. It parses
  `payload` with the schema the caller passed, as the real client does, so a malformed
  payload rejects with `ApiValidationError`.
- Each public API function has a test with a valid payload built from the contract example
  and one with an invalid payload.

## Verification

Types enforce most rules (`validate` is a required schema, typed errors). The checks below
catch the structural rules ESLint and TS do not see. A clean run prints nothing.

**1. `fetch(` outside `src/shared/api/client.ts`:**

```bash
rg -n '\bfetch\s*\(' src --glob '!src/shared/api/client.ts' --glob '!**/*.test.{ts,tsx}'
```

**2. `apiClient` used outside `src/shared/api/`:**

```bash
rg -n '\bapiClient\b' src --glob '!src/shared/api/**'
```

**3. Bare `data as T` / `response as T` casts inside `shared/api/`:**

```bash
rg -n '\b(data|response)\s+as\s+[A-Za-z]' src/shared/api --glob '!**/*.test.{ts,tsx}'
```

**4. Hand-written response guards or re-checks inside `shared/api/`:**

```bash
rg -n 'function is\w+Response\(|: unknown = await apiClient|v\.custom\(' src/shared/api --glob '!**/*.test.{ts,tsx}'
```

**5. Inline query keys outside `src/shared/query/`:**

```bash
rg -n 'queryKey:\s*\[|(get|set|remove|cancel|invalidate|refetch|reset)Quer(y|ies)(Data)?\(\s*\[|(ensure|fetch|prefetch)Query(Data)?\(\s*\[' src --glob '!src/shared/query/**' --glob '!**/*.test.{ts,tsx}'
```

**6. Mappers imported by render-flow files:** `npm run eslint` passes. The
`no-restricted-imports` rule for `src/pages/**/*.tsx` and `src/pages/**/use*.ts` in
`eslint.config.mjs` lists the mapper modules by file, so a new mapper module is added to its
regex. `lobbyPlayers` is not in it yet; #194 adds it or records the exception.
