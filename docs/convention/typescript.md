# TypeScript

These rules are source-of-truth for TypeScript and must be checked against `src` before changing them.

## Compiler flags (tsconfig.json)

Must be enabled and not disabled:

- `strict: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`
- `noUncheckedIndexedAccess: true` (index access can produce `T | undefined`)
- `exactOptionalPropertyTypes: true` (`foo?: string` != `foo: string | undefined`)

## Forbidden

- `any` (`@typescript-eslint/no-explicit-any: error`)
- `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- non-null assertions (`value!.prop`)
- `as X as Y`
- `as T` where no full preceding runtime validation proves type shape
- `as unknown` in production code (test files may use it for mock construction)
- bare `JSX.Element` in production code — use `React.JSX.Element` (test helpers may keep `JSX.Element`)
- `Dispatch<SetStateAction<T>>` in public interfaces — use `(value: T) => void`
- prefixed interfaces (`IGameState` style)
- domain `string[]` when domain members are known -> prefer literal union

## Required

- All exported functions have explicit return types.
- All exported components return `React.JSX.Element` / `React.JSX.Element | null`.
- Async inner functions (including in `useEffect`) have explicit return types.
- `parseInt(value, 10)` always uses explicit radix 10.

## `as` casts — when allowed

Allowed only in these cases:

1. After a full local type guard in the same function:

```ts
if (!isRecord(value)) return null;
const obj = value as Record<string, unknown>;
```

2. API adapter boundary with an explicit inline rationale comment.

```ts
fetchConfig.body = isJsonBody(body) ? JSON.stringify(body) : (body as BodyInit); // safe: BodyInit accepts any serializable value
```

3. Tests (`*.test.ts`, `*.test.tsx`) where casts are isolated to test mocks.

In production code, any `as unknown` should be replaced with runtime validation before use.

## Type guards

Shared guards live in `src/shared/lib/guards/guards.ts`.

- `isRecord(value): value is Record<string, unknown>`
- `isFiniteNumber(value): value is number`

Validation rules:

- Guards must validate full shape, not only `isRecord` alone.
- Shared guards used in 2+ files must stay in `src/shared/lib/guards/guards.ts`.
- `apiClient` calls must pass `validate: (data: unknown) => data is T`.
- `location.state` is validated via `parseLocationState<T>(state, validate)` from `src/shared/lib/router/locationState.ts`. Direct `as` casts on `location.state` are forbidden; the call site provides the page-local type guard.

## Naming

- `interface` for object shapes.
- `type` for unions/intersections/computed aliases.
- Component props as `FooProps` local interfaces.
- No `.types.ts` files.
- No `export type Alias = ExistingType` style aliases without added meaning.

### API suffixes

- response DTOs: `Response`
- request DTOs: `Request` / `Payload`
- component props: `Props`
- `Dto` suffix is not used.

## Discriminated unions

Use explicit discriminants (`type: "full-state" | "ack"`) and avoid `type: string`.

## Environment variables

All env vars must be declared in `src/vite-env.d.ts` and referenced directly via `import.meta.env`.

No `as string | undefined` casts should be used to bypass typing.

## Numeric inputs

`Number(...)` and `parseInt(...)` must be validated before use.

- route params: validate numeric conversions and allow `0` when valid
- avoid truthy checks for numbers (`if (value)`); use `value !== undefined` / `value !== null`
- `??` defaults allowed only for constant fallbacks with explicit meaning; domain data should usually flow as error/loading state first

## Verification

One compact command — `typecheck` + `eslint` cover most rules, the trailing `rg` catches what lint does not (chained `as`, `as unknown`, `JSX.Element`, `React.FC`, `Dispatch<SetStateAction>`, non-null `!.`), with test files excluded:

```bash
npm run typecheck && npm run eslint && rg -nP 'as .+ as |\bas unknown\b|(?<!React\.)JSX\.Element|React\.(FC|FunctionComponent)|Dispatch<SetStateAction|[A-Za-z_)\]]!\.' src -g '!**/*.test.{ts,tsx}' -g '!src/test/**'
```
