# Security

## Reporting a vulnerability

Report a vulnerability privately through a GitHub security advisory:
https://github.com/IliasAlmerekov/darts/security/advisories/new.
Keep it out of public issues, pull requests, and comments. Only `main` gets security fixes.

## Security review guidelines

The backend (`../dartsapp-backend`) enforces every access rule, and its `SECURITY.md`
holds the server-side threat model. This app runs in the browser, so it must never
become the way around those rules. Review every diff as an attacker would. Three attackers
matter:

- a player (`ROLE_PLAYER`) on their own phone, who edits requests, storage, and the bundle
  at will;
- a hostile website or link that the admin tablet or a player opens;
- anyone who reads the public bundle, the repository, or the browser console.

A security finding names the attacker, what they do, and what they gain. P0 is Critical,
P1 is High, and P2 is Medium.

### Not reportable

- Role checks in `src/app/ProtectedRoutes.tsx` that a player can bypass in the browser.
  They choose the screen; the backend decides access. A route guard is a finding only when
  the backend leaves the same data open.
- The local default `VITE_API_TARGET=http://localhost:8001` in `.env.example` and
  `vite.config.ts`. It is the dev proxy target.
- The invitation link in `sessionStorage` on the admin tablet. The tablet shows it as a QR
  code to every player anyway.
- Test credentials read from `PLAYWRIGHT_TEST_*` environment variables.

### Script injection

React escapes text, so injection comes from the sinks that skip it. A new
`dangerouslySetInnerHTML`, `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
`document.write`, `eval`, `new Function`, or a string passed to `setTimeout` is a P0 when
any part of the value comes from the backend, the URL, or storage. A username, guest name,
or other text a player typed reaches the screen only as a React text child.

An `href`, `src`, or `action` built from data outside the bundle accepts only `http:` and
`https:` URLs. A `javascript:` or `data:` URL that can reach one of them is a P0.

The scheme check alone does not make an origin trusted. A form `action` from such data
points at the app's own origin, or another origin can collect what the player types: a P0.
An `href` or `src` from such data that leads to another origin matches an allowlist in the
bundle. A link to an origin that data chose is a P1, because it opens a phishing page from
inside the app.

### Redirects and navigation

Every navigation target that comes from the backend, the query string, or
`location.state` goes through `toSafeRedirectPath` or `resolveSafeRedirect` in
`src/shared/lib/router/safeRedirect.ts`. A path that skips them, or a change that loosens
their checks (`//`, `\`, control characters, another origin), is a P0: it turns a login
link into a phishing redirect.

### Requests and sessions

`apiClient` in `src/shared/api/client.ts` sends every request with
`credentials: "include"` to `VITE_API_BASE_URL`, or to `/api` on the app's own origin
when that variable is unset. Code that sends cookies to another host is a P0: a `fetch`
outside `apiClient`, a URL built from response data, or a base URL from the query string.

The session lives in an `HttpOnly` cookie that this app never reads. Storing a password,
session id, CSRF token, or remember-me value in `localStorage`, `sessionStorage`,
IndexedDB, a store, or the URL is a P0. Logout and the 401 handler call
`clearClientSession()`; a new piece of client state about the user that it does not
clear is a P1, because the shared tablet changes hands.

### Secrets and the bundle

Vite inlines every `VITE_*` variable into the public bundle. A secret, API key, or
password in a `VITE_*` variable, in source, or in a committed `.env` file is a P0.
`npm run secrets:check` catches only a few known patterns, so read every new constant and
env variable.

### Logs and errors

Logs go through `clientLogger`, which redacts keys that match its `SENSITIVE_KEY_PATTERN`.
A log field that carries a password, token, session id, or API key under a key the pattern
misses is a leaked secret and a P0. A narrower pattern is a P1. A message on screen shows
the user-facing text from `src/shared/lib/error/`, never a raw response body or stack trace.

### Deployment config

`deploy/frontend.nginx.conf` and `deploy/Caddyfile` decide which origin serves the app and
the API. A change that serves the API from another origin, proxies `/api` to a host other
than the backend, or exposes source maps or `.env` files is a P0.

The Vite dev proxy forwards `/api` traffic, cookies included, to `VITE_API_TARGET`. A
committed `.env`, or a target in `.env.example` or `vite.config.ts` that is not a local
host, is a P0.

### Dependencies

A new or upgraded npm package needs the user's approval (`AGENTS.md`, `## Guardrails`)
and passes the CI gate `npm audit --omit=dev --audit-level=high`. A package with an install
script, or one the change could do without, is a P2.
