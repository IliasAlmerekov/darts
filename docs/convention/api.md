# API

Rules for the HTTP layer in `src/shared/api/` and DTO -> UI mapping in
`src/shared/lib/<domain>/`. Source-of-truth: must be checked against `src/shared/api/`
before changing.

## Layout

```
src/shared/api/
  client.ts            # apiClient + ApiValidationError + setUnauthorizedHandler
  errors.ts            # typed error classes
  endpoints.ts         # cross-domain endpoints only (currently: createInviteEndpoint)
  schemas.ts           # Valibot schemas shared by 2+ domain files
  types.ts             # apiClient types (HttpMethod, ApiRequestConfig, QueryParams)
  index.ts             # barrel: cross-cutting public surface
  test-utils.ts        # createMockResponse and respondWith helpers for tests
  auth.ts              # per-domain public surface (auth flows + DTO types)
  game.ts              # per-domain public surface (game flows + ETag cache)
  room.ts              # per-domain public surface (room flows)
  statistics.ts        # per-domain public surface (stats flows)
  *.test.ts            # co-located tests
```

DTO -> UI mappers live in `src/shared/lib/<domain>/`, **not** under `shared/api/`. See the
"Mappers" section below.

## Public surface

The API layer has two levels (also documented in `architecture.md`):

- `@/shared/api` (the `index.ts` barrel) -- cross-cutting symbols only: `apiClient`,
  `setUnauthorizedHandler`, `clearUnauthorizedHandler`, `ApiError`, `UnauthorizedError`,
  `ForbiddenError`, `NetworkError`, `TimeoutError`, `API_BASE_URL`, plus everything
  re-exported from `endpoints.ts` and the per-domain modules.
- `@/shared/api/<domain>` -- the domain module is the public entry for its DTO types,
  resource functions, guards (when needed externally) and any per-domain caches.

Internals -- `client.ts`, `errors.ts`, `types.ts`, `endpoints.ts`, `schemas.ts` -- must never be deep-
imported from outside `shared/api/`. Always go through the barrel.

## `apiClient` -- single gateway

`fetch()` is called in exactly **one** place: `src/shared/api/client.ts`. Every other
network call goes through `apiClient.{get,post,put,patch,delete,request}`.

Rules for callers:

- Every call **must** pass `validate`: the Valibot schema of the response body. There is
  no overload without it. Calls without `validate` are a type error.
- The schema describes the full response shape, as `docs/backend-api-contract.json`
  defines it. `apiClient` runs `v.safeParse` and returns the typed output, so the return
  type is `v.InferOutput` of the schema. If parsing fails, the client throws
  `ApiValidationError` with the raw body in `raw`.
- `AbortSignal` is forwarded through the optional `signal` config; combine it with the
  client's built-in 30s timeout (do not add a second timeout).
- For 4xx/5xx the client throws a typed error (see below). The success path is reached
  only when the response is OK and the validator passes.
- Use `apiClient.request(..., { returnResponse: true })` only when the caller needs the
  raw `Response` (status, headers) -- e.g. ETag flows. Otherwise the helper methods
  (`get`/`post`/...) are the convention.

## Parse once

`apiClient` parses each response once. The domain function uses the typed output directly
and does not check it again:

```ts
const game = await apiClient.get(GAME_ENDPOINT(id), {
  signal,
  validate: gameThrowsResponseSchema,
});

return game;
```

Do not re-check the result with a guard, and do not widen it to `unknown`. When the
endpoint's data needs a UI shape, pass the output to a mapper (see "Mappers").

## Response schemas

ADR 0002 records why responses are described by Valibot schemas.

- Each response read in a domain file has one schema, declared above the resource
  functions as `camelCaseSchema` (`gameThrowsResponseSchema`). Import Valibot as
  `import * as v from "valibot"`.
- The response type is inferred from the schema:
  `export type GameSettingsResponse = v.InferOutput<typeof gameSettingsResponseSchema>`.
  Do not write a separate interface for it. `@/types` re-exports response types that
  pages use.
- Follow the contract: a required field is required, an optional field is `v.optional`,
  `nullable: true` is `v.nullable`, `integer` is `integerSchema`. A
  contract `default` goes into `v.optional(schema, default)`, so the output type has the
  field.
- A schema may be narrower than the contract where the contract is untyped (for example
  a `status` string becomes `v.picklist`). It must not be looser.
- A client-side discriminant the backend does not send is added with `v.transform` in the
  schema (`type: "full-state"`), so the type matches the runtime value.
- A schema used by 2+ domain files lives in `schemas.ts`, like a shared endpoint in
  `endpoints.ts`. `integerSchema` (contract `integer`) lives there too.
- Shared guards in `@/lib/guards/guards` are for code outside the API layer. Do not write
  `isXxxResponse` guards in `shared/api/`.

## Typed errors

All errors thrown by `apiClient` are instances of `ApiError` or its subclasses:

| Class               | Status | When                                                                              |
| ------------------- | ------ | --------------------------------------------------------------------------------- |
| `ApiError`          | n      | Generic non-OK status not covered below                                           |
| `UnauthorizedError` | 401    | Session invalid; triggers global redirect handler unless `skipAuthRedirect: true` |
| `ForbiddenError`    | 403    | Authenticated user lacks permission                                               |
| `NetworkError`      | 0      | `fetch` rejection (no response received)                                          |
| `TimeoutError`      | 0      | Built-in 30s timeout aborted the request                                          |

`ApiValidationError` (in `client.ts`) is a separate class -- it does **not** extend
`ApiError`. It is thrown when the body does not match the `validate` schema; `raw` holds
the body.

Rules:

- Throw `new ApiError(message, { status, data, url })` with structured options. Never
  `new Error(...)` for HTTP failures.
- Catch by class (`error instanceof UnauthorizedError`) -- do not branch on `error.status`
  unless you specifically need the numeric value.
- Do not extend `ApiError` further per-domain. Add response-shape data to the existing
  hierarchy via the `data` field instead.

## Endpoints

Three forms coexist:

- **Static path constant** at the top of the domain file:
  `const LOGIN_ENDPOINT = "/login";`
- **Path builder** for path-with-id endpoints:
  ```ts
  const GAME_ENDPOINT = (id: number) => `/game/${id}`;
  ```
- **Cross-domain shared** in `endpoints.ts`. Only used when two or more domain files
  reference the same path (currently: `createInviteEndpoint`).

Rules:

- Domain endpoints stay inside the domain file. Do not move them to `endpoints.ts`
  preemptively.
- Endpoint constants are `UPPER_SNAKE_CASE`; builders are camelCase functions.
- A path literal that occurs in 2+ domain files moves to `endpoints.ts`.

## Mappers (DTO -> UI)

Mappers are **pure functions** that translate backend DTO shapes into UI-friendly types.

Rules:

- They live in `src/shared/lib/<domain>/` (see `shared/lib/game/`: `gameStateNormalizer`,
  `applyOptimisticUndo`, `mergeGameSettings`, `player-mappers`, `roundAverage`,
  `parseThrowValue`, `finishedGameStandings`).
- Every mapper has a co-located `*.test.ts` (`gameStateNormalizer.test.ts`,
  `player-mappers.test.ts`, ...).
- Mappers are called from any of: an API domain function (e.g. inside
  `getGameThrows`), a store action (e.g. `setGameData(data)` calls `normalizeGameData(data)`
  before `gameDataAtom.set(...)`), or a **page-private logic file** under
  `src/pages/<Page>/lib/*` -- these are pure-logic layers and may transform DTOs locally.
- Mappers must **not** be called from JSX (`*.tsx` render bodies) or from page hooks that
  participate in the render flow (`use*.ts` directly returning derived data into render).
  Run the transform in a `lib/` file or a store action and feed the UI the already-mapped
  result.
- Raw DTOs are not passed to UI components. The store / API / page-`lib` layer owns the
  mapping; UI receives the mapped shape.

## ETag / conditional fetches

`getGameThrowsIfChanged` in `game.ts` is the canonical pattern:

- Per-id version map (`gameStateVersionById = new Map<number, string>()`) lives module-
  scoped in the domain file.
- Send `If-None-Match` + `query: { since }`, accept 304 via `acceptedStatuses: [304]`,
  pull headers via `returnResponse: true`.
- Public helpers `setGameStateVersion(gameId, version)` / `resetGameStateVersion(gameId?)`
  let consumers (store actions, hooks) manage the cache key explicitly.

If a new domain needs conditional fetches, mirror this layout.

## Error -> user message

User-facing messages come from `toUserErrorMessage(error, fallback?)` in
`src/shared/lib/error/error-to-user-message.ts`.

- Never put raw `error.message` or `error.data.message` in JSX. Pass the error through
  `toUserErrorMessage` first.
- The function recognises `NetworkError`, `ApiError` (by status and by payload `error` /
  `message` fields), generic `Error`, and bare strings. Extend the function in place when
  adding new sanitised messages -- do not write parallel sanitisers in pages.

## Test patterns

- Use `createMockResponse({ body, headers, status, url })` from `src/shared/api/test-utils.ts`
  to build mock `Response` objects.
- API domain tests mock `apiClient.{get,post,...}`, **not** `fetch`. The single fetch in
  `client.ts` is exercised by `client.test.ts`.
- Mock an `apiClient` method with `respondWith(payload)` from `test-utils.ts`. It parses
  `payload` with the schema the caller passed, as the real client does, so a malformed
  payload rejects with `ApiValidationError`.
- Each public API function has a test with a valid payload built from the contract
  example and one with an invalid payload.
- Mappers are unit-tested in isolation (no API mocks needed since they are pure).

## Verification

Most rules are enforced by types (`validate` is a required schema, `ReadableAtom` removes `.set`,
typed errors). The remaining checks below catch the structural rules ESLint and TS do not
see.

**1. `fetch(` outside `src/shared/api/client.ts`** -- the gateway must stay sole:

```bash
rg -nP '\bfetch\s*\(' src --glob '!src/shared/api/client.ts' --glob '!**/*.test.{ts,tsx}'
```

**2. Bare `data as T` / `response as T` casts inside `shared/api/`**:

```bash
rg -nP '\b(data|response)\s+as\s+[A-Za-z]' src/shared/api --glob '!**/*.test.{ts,tsx}'
```

**3. Hand-written response guards or re-checks inside `shared/api/`**:

```bash
rg -nP 'function is\w+Response\(|: unknown = await apiClient|v\.custom\(' src/shared/api --glob '!**/*.test.{ts,tsx}'
```

**4. Mappers imported by render-flow files** -- mappers may live in API / store /
`pages/<X>/lib/`, but must not appear in JSX or render-flow hooks. ESLint enforces this
(`no-restricted-imports` for `src/pages/**/*.tsx` and `src/pages/**/use*.ts` in
`eslint.config.mjs`). The rule lists the mapper modules named above by file, so a new
mapper module must be added to its regex.

A clean run of the `rg` checks prints nothing, and `npm run eslint` passes.
