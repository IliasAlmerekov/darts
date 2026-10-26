# Errors

Rules for error classes, catch handling, route errors, user-facing messages, and logging.

## Error layers

```
src/shared/api/errors.ts                      # HTTP error hierarchy
src/shared/api/client.ts                      # ApiValidationError + apiClient throw sites
src/shared/lib/error/error-to-user-message.ts # generic user-safe message mapping
src/shared/lib/error/auth-error-handling.ts   # auth-specific user-safe message mapping
src/shared/services/browser/clientLogger.ts   # logging and key-based redaction
src/app/ErrorBoundary.tsx                     # React Router errorElement logging + fallback UI
```

Each concern stays in its file above. User-facing message mapping lives only in
`src/shared/lib/error/*`; pages call it instead of writing their own sanitizer.

## HTTP errors

| Class                | Extends    | Status          | Meaning                                             |
| -------------------- | ---------- | --------------- | --------------------------------------------------- |
| `ApiError`           | `Error`    | caller-provided | non-OK HTTP response or domain/API contract failure |
| `UnauthorizedError`  | `ApiError` | 401             | unauthenticated session                             |
| `ForbiddenError`     | `ApiError` | 403             | authenticated user lacks permission                 |
| `NetworkError`       | `ApiError` | 0               | fetch rejected before a response                    |
| `TimeoutError`       | `ApiError` | 0               | apiClient timeout aborted the request               |
| `ApiValidationError` | `Error`    | none            | response body failed the `validate` schema          |

- Import HTTP error classes from `@/shared/api`, not from `@/shared/api/errors`.
- Throw HTTP failures as `new ApiError(message, { status, data, url })`.
- Use the existing `data`, `url`, `originalError`, and `retryAfterSeconds` fields instead of
  per-domain `ApiError` subclasses. `apiClient` sets `retryAfterSeconds` from the
  `Retry-After` header of a 429 when it holds whole seconds.
- `ApiValidationError` is not an `ApiError`, so `instanceof ApiError` does not catch it.
- Re-wrap `ApiValidationError` as `ApiError` only when a domain function deliberately reports
  a 200 response with an invalid contract (`getAuthenticatedUser` in `auth.ts`).

## Domain errors

Domain-specific `Error` subclasses model control flow, not HTTP. The app has none today. A
new one follows these rules:

- It sits next to the flow that owns it.
- It sets `this.name` in the constructor.
- It carries no transport fields and parses no response payload.
- It extends `Error`, never `ApiError`.

## Catch blocks

- Return silently on an abort: the operation was cancelled on purpose. Effects check
  `error.name === "AbortError"`; a `queryFn` checks `signal.aborted`.
- Log unexpected failures through `clientLogger.error(event, { context, error })`.
- Keep the original `Error` object in state only when the UI or store models technical error
  state (`$error: Error | null`).
- Page-level UI error state holds strings that came from a user-safe mapper or from local
  validation.

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

Two mappers are canonical:

- `toUserErrorMessage(error, fallback?)` for caught errors outside auth flows. It recognises
  `NetworkError`, `ApiError` (by status and by payload `error` / `message` fields), generic
  `Error`, and bare strings.
- `mapAuthErrorMessage({ flow, error, rawMessage })` for login and registration.

Rules:

- JSX renders the mapper's output, never `error.message` or `ApiError.data.message`.
- Local validation strings may be assigned directly (`"Please create a game first."`).
- A typed backend business payload may supply a user message only after a runtime guard
  proves its shape (`isAddGuestErrorResponse` in `src/pages/StartPage/useGuestFlow.ts`).
- When a new backend phrase needs a safer message, extend the mapper in
  `src/shared/lib/error/*`.

## Logging

- Log an unexpected caught failure with `clientLogger.error`, also when the app continues
  on a fallback (the `sessionStorage` helpers in `src/shared/store/game-session.ts`,
  `room.restore.failed`). Log an expected condition the app handles with
  `clientLogger.warn` (`room.restore.access_denied`, `room.restore.invitation_load_failed`).
  Application code calls no `console.*`.
- Event names are stable `domain.action.failed` strings (`game.undo.failed`). Older files use
  underscore style (`wake_lock_release_failed`); keep a file's existing style. One call
  uses neither: the CSRF prefetch warning in `src/shared/api/auth.ts`, which #218 renames.
- Put structured metadata under `context` and pass the caught value as `error`, so
  `clientLogger` can serialize it.
- `clientLogger` redacts values by key name only (`SENSITIVE_KEY_PATTERN`: authorization,
  cookie, csrf, invitationlink, password, secret, session, token). Put such values under a
  matching key or leave them out; never inside a message string or an unrelated key.

## Route errors

`src/app/ErrorBoundary.tsx` handles React Router route errors.

- Loaders throw `new Response(..., { status })` for expected route failures such as an
  invalid route param (`routeGameIdOrNotFound`, used by every loader with a game id).
- `ErrorBoundary` renders `NotFoundPage` for a 404 route error response and does not log it.
- Read route response fields only after `isRouteErrorResponse(error)`.
- Normalize non-`Error` route failures to `Error` before logging.
- The rendered fallback for any other error stays generic; details go to the log.
- Error boundaries are function components built on `useRouteError()`; the project has no
  class-based boundary.

## Browser capability errors

- Browser API availability checks catch known failure modes (`SecurityError` for storage
  access in `src/shared/store/game-session.ts`).
- Log unexpected browser API failures when the app can continue with degraded behaviour.
- Ignore a failure only when the user-visible fallback is explicit and no useful telemetry
  exists (the clipboard fallback in `QRCode.tsx`).

## Verification

A clean run of each command prints nothing.

**1. No raw console calls in production source:**

```bash
rg -n '\bconsole\.\w+' src --glob '*.{ts,tsx}' --glob '!**/*.test.{ts,tsx}'
```

**2. No deep imports from the HTTP error internals:**

```bash
rg -n -F '@/shared/api/errors' src --glob '*.{ts,tsx}' --glob '!**/*.test.{ts,tsx}'
```

**3. No `ApiError` subclasses outside the API hierarchy:**

```bash
rg -n 'extends ApiError' src --glob '*.{ts,tsx}' --glob '!src/shared/api/errors.ts' --glob '!**/*.test.{ts,tsx}'
```
