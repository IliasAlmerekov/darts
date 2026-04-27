# Errors

Rules for error classes, catch handling, route errors, user-facing messages, and logging
handoff. Source-of-truth: must be checked against `src/` before changing.

## Error layers

The project has four distinct error layers:

```
src/shared/api/errors.ts                      # HTTP error hierarchy
src/shared/api/client.ts                      # ApiValidationError + apiClient throw sites
src/shared/lib/error/error-to-user-message.ts # generic user-safe message mapping
src/shared/lib/error/auth-error-handling.ts   # auth-specific user-safe message mapping
src/app/ErrorBoundary.tsx                     # React Router errorElement logging + fallback UI
```

Rules:

- Keep HTTP transport errors in `src/shared/api/errors.ts`.
- Keep `ApiValidationError` in `src/shared/api/client.ts`.
- Keep user-facing message mapping in `src/shared/lib/error/*`.
- Keep route-error normalization in `src/app/ErrorBoundary.tsx`.
- Do not add parallel error sanitizer helpers in pages.

## HTTP errors

The API hierarchy is:

| Class                | Extends    | Status          | Meaning                                             |
| -------------------- | ---------- | --------------- | --------------------------------------------------- |
| `ApiError`           | `Error`    | caller-provided | non-OK HTTP response or domain/API contract failure |
| `UnauthorizedError`  | `ApiError` | 401             | unauthenticated session                             |
| `ForbiddenError`     | `ApiError` | 403             | authenticated user lacks permission                 |
| `NetworkError`       | `ApiError` | 0               | fetch rejected before a response                    |
| `TimeoutError`       | `ApiError` | 0               | apiClient timeout aborted the request               |
| `ApiValidationError` | `Error`    | none            | response body failed `validate(...)`                |

Rules:

- Import HTTP error classes from `@/shared/api`, not from `@/shared/api/errors`.
- Throw HTTP failures as `new ApiError(message, { status, data, url })`.
- Use the existing `data`, `url`, and `originalError` fields instead of creating
  per-domain `ApiError` subclasses.
- Keep `ApiValidationError` separate from `ApiError`; do not catch it by `ApiError`.
- Re-wrap `ApiValidationError` to `ApiError` only when a domain function intentionally
  reports a 200 response with an invalid contract.

## Domain errors

Domain-specific `Error` subclasses are allowed when they model control flow, not HTTP:

```ts
export class ThrowRejectedError extends Error {
  constructor(message = "Throw request was not accepted by server") {
    super(message);
    this.name = "ThrowRejectedError";
  }
}
```

Rules:

- Place domain error classes next to the domain flow that owns them.
- Set `this.name` in the constructor.
- Keep the class small: no transport fields, no response payload parsing.
- Do not extend `ApiError` for domain-specific cases.

## Catch blocks

Rules:

- Catch values as `unknown` unless TypeScript infers `unknown` already.
- Handle aborts first and silently return when the operation was intentionally cancelled.
- Log unexpected failures through `clientLogger.error(event, { context, error })`.
- Store the original `Error` object in state only when the UI or store explicitly models
  technical error state (`$error: Error | null`).
- Store strings in page-level UI error state only after mapping through a user-safe
  function or after local validation produced the string.
- Do not leave an empty `catch` unless the failure is an intentionally ignored browser
  fallback.

Canonical async shape:

```ts
try {
  await saveThing(signal);
} catch (error) {
  if (error instanceof Error && error.name === "AbortError") {
    return;
  }

  clientLogger.error("thing.save.failed", {
    context: { thingId },
    error,
  });
  setPageError(toUserErrorMessage(error, "Could not save thing."));
}
```

## User-facing messages

Two message mappers are canonical:

- `toUserErrorMessage(error, fallback?)` for general app/API failures.
- `mapAuthErrorMessage({ flow, error, rawMessage })` for login and registration.

Rules:

- Do not render `error.message` directly in JSX.
- Do not render `ApiError.data.message` directly in JSX.
- Use `toUserErrorMessage` for caught `unknown` errors outside auth flows.
- Use `mapAuthErrorMessage` for login and registration errors.
- Local validation strings may be assigned directly (`"Please create a game first."`).
- Typed backend business payloads may supply a user message only after a runtime guard
  proves the payload shape (`AddGuestErrorResponse` is the current example).
- Extend the mapper in `src/shared/lib/error/*` when a new backend phrase needs a safer
  user message.

## Logging handoff

`errors.md` defines when to log; the detailed logger/redaction contract belongs to
`logging.md`.

Rules:

- Use `clientLogger.error` for unexpected caught failures.
- Include stable event names (`domain.action.failed` or existing underscore style in
  legacy files).
- Put structured metadata under `context`.
- Pass the caught value as `error` so `clientLogger` can serialize it.
- Do not call `console.error`, `console.warn`, `console.log`, or `console.info` from
  application code.
- Do not log secrets, tokens, passwords, cookies, CSRF values, session data, or invitation
  links.

## Route errors

React Router route errors are handled by `src/app/ErrorBoundary.tsx`.

Rules:

- Use `throw new Response(..., { status })` in loaders for expected route failures such
  as invalid route params.
- Use `isRouteErrorResponse(error)` before reading route response fields.
- Normalize non-`Error` route failures to `Error` before logging.
- Keep the rendered route fallback generic; log details, do not show internals.
- Do not introduce class-based React error boundaries.

## Browser capability errors

Rules:

- Browser API availability checks must catch known failure modes (`SecurityError` for
  storage access).
- Log unexpected browser API failures when the app can continue with degraded behavior.
- Ignore failures only when the user-visible fallback is already explicit and no useful
  telemetry exists (clipboard fallback is the current pattern).

## Verification

**1. No raw console calls in production source**:

```bash
rg -n 'console\.(error|warn|log|info)' src --glob '*.{ts,tsx}' --glob '!**/*.test.{ts,tsx}'
```

**2. No deep imports from the HTTP error internals**:

```bash
rg -n -F '@/shared/api/errors' src --glob '*.{ts,tsx}' --glob '!**/*.test.{ts,tsx}'
```

**3. No new `ApiError` subclasses outside the API hierarchy**:

```bash
rg -n 'extends ApiError' src --glob '*.{ts,tsx}' --glob '!src/shared/api/errors.ts' --glob '!**/*.test.{ts,tsx}'
```

A clean run of all three prints nothing.
