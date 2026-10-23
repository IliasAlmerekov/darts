# TypeScript

Rules for TypeScript code. Check them against `src` before changing.

## Compiler flags

`tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`,
`noFallthroughCasesInSwitch`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
Keep all six on. Two of them change how code is written:

- `noUncheckedIndexedAccess`: index access yields `T | undefined`; narrow before use.
- `exactOptionalPropertyTypes`: `foo?: string` is not `foo: string | undefined`; omit the
  key instead of assigning `undefined`.

## Forbidden

- `any` (`@typescript-eslint/no-explicit-any: error`)
- `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- non-null assertions (`value!.prop`)
- `as X as Y`
- `as T` without full preceding runtime validation of the shape (see `as` casts below)
- `as unknown` in production code; replace it with runtime validation (test files may use
  it to build mocks)
- bare `JSX.Element`; `@types/react` 19 has no global `JSX` namespace, so use
  `React.JSX.Element`
- `React.FC` / `React.FunctionComponent`
- `Dispatch<SetStateAction<T>>` in public interfaces; use `(value: T) => void`
- `I`-prefixed interfaces (`IGameState`); the ESLint `naming-convention` rule rejects them
- `string[]` for a domain whose members are known; use a literal union

## Required

- All exported functions have explicit return types.
- All exported components return `React.JSX.Element` / `React.JSX.Element | null`.
- Async inner functions (including in `useEffect`) have explicit return types.

## `as` casts -- when allowed

Only in these cases:

1. After a full local type guard in the same function:

```ts
if (!isRecord(value)) return null;
const obj = value as Record<string, unknown>;
```

2. At the API adapter boundary, with an inline rationale comment:

```ts
fetchConfig.body = isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit); // safe: BodyInit accepts any serializable value
```

3. In tests (`*.test.ts`, `*.test.tsx`), isolated to mock construction.

## Type guards

Shared guards live in `src/shared/lib/guards/guards.ts` (`isRecord(value): value is
Record<string, unknown>`). API responses are not checked by guards: each has a Valibot
schema in its `src/shared/api/` domain file (see `api.md`).

- A guard validates the full shape; `isRecord` alone is not enough.
- A guard used in 2+ files lives in `src/shared/lib/guards/guards.ts`.
- `apiClient` calls pass `validate: <Valibot schema>`; the result type is inferred from it.
- `location.state` goes through `parseLocationState<T>(state, validate)` from
  `src/shared/lib/router/locationState.ts`, with a page-local type guard as `validate`.
  Never cast `location.state` with `as`.

## Naming

- `interface` for object shapes, except API response types: they are
  `type XResponse = v.InferOutput<typeof xResponseSchema>`.
- Component props are local `FooProps` interfaces.
- No `.types.ts` files.
- No `export type Alias = ExistingType` aliases that add no meaning.
- DTO suffixes: `Response` for responses, `Request` / `Payload` for requests. The `Dto`
  suffix is not used in type names; it appears only in comments that cite a backend
  contract name (`/** Contract \`GameResponseDto\`. \*/`).

## Environment variables

Declare every env var in `src/vite-env.d.ts` (`ImportMetaEnv`) and read it directly via
`import.meta.env`, with no `as string | undefined` casts.

## Numeric inputs

Validate `Number(...)` and `parseInt(..., 10)` results before use.

- Route params: validate the numeric conversion and accept `0` when valid. A game id in an
  admin route goes through `parseRouteGameId`, which accepts positive safe integers only
  ([ADR 0004](../adr/0004-tablet-game-from-server.md)).
- Check numbers with `value !== undefined` / `value !== null`, not truthiness, so `0`
  survives.
- `??` defaults only for constant fallbacks with explicit meaning; missing domain data
  flows as an error or loading state.

## Verification

`typecheck` and `eslint` cover most rules; the trailing `grep` catches what lint does not
(chained `as`, `as unknown`, bare `JSX.Element`, `React.FC`, `Dispatch<SetStateAction>`,
non-null `!.`), with tests excluded:

```bash
npm run typecheck && npm run eslint && grep -rnP --include='*.ts' --include='*.tsx' --exclude='*.test.ts' --exclude='*.test.tsx' --exclude-dir=test 'as .+ as |\bas unknown\b|(?<!React\.)JSX\.Element|React\.(FC|FunctionComponent)\b|Dispatch<SetStateAction|[A-Za-z_)\]]!\.' src
```

A clean run prints nothing after the typecheck and lint output.
