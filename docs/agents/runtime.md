# Local runtime

When most mocked specs fail on the login page, read `test-results/*/error-context.md`. A Vite
import error there means the dev server on :5173 runs stale `node_modules`; Playwright reuses
it. Run `docker compose -f compose.dev.yaml restart frontend`.

Locally the app runs as one Compose stack, the project `darts`: frontend on :5173, backend
nginx on :8001, php and mysql. Both repos' compose files carry `name: darts`, so any
`docker compose` command joins that stack; start it with `docker compose up -d` in the
workspace folder that holds both repos. The frontend container serves the main checkout.
In a worktree, `npm run test:e2e` starts its own Vite on :5174 for the run, so it tests the
worktree's code. A manual browser check of a worktree uses `npm run dev -- --port 5174`;
stop that server when the check is done.
