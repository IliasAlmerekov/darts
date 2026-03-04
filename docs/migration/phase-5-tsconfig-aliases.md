# Phase 5 — Simplify tsconfig aliases and final cleanup

## Goal

Remove aliases from `tsconfig.json` that were hiding the old structure.
Make import paths honest and predictable.

## Current `tsconfig.json` state

```json
"paths": {
  "@/*":           ["./src/*"],
  "@/app/*":       ["./src/app/*"],
  "@/assets/*":    ["./src/assets/*"],
  "@/entities/*":  ["./src/entities/*"],          // ← remove (entities/ deleted)
  "@/features/*":  ["./src/features/*"],
  "@/shared/*":    ["./src/shared/*"],
  "@/components/*": ["./src/shared/ui/*"],         // ← remove (ghost)
  "@/hooks/*":     ["./src/shared/hooks/*"],       // ← remove (shared/hooks/ deleted)
  "@/lib/*":       ["./src/shared/lib/*"],         // ← can keep as convenience alias
  "@/stores":      ["./src/shared/stores/index.ts"], // ← remove (shared/stores/ deleted)
  "@/stores/*":    ["./src/shared/stores/*"],      // ← remove
  "@/types":       ["./src/shared/types/index.ts"], // ← can keep
  "@/types/*":     ["./src/shared/types/*"]        // ← can keep
}
```

## Tasks

### 5.1 — Preliminary check: any live imports?

Before removing aliases, make sure nothing still uses them:

```bash
# each should return 0 results:
grep -r 'from "@/entities' src/
grep -r 'from "@/stores' src/
grep -r 'from "@/hooks/' src/
grep -r 'from "@/components/' src/
```

If grep returns hits, go back to the corresponding phase and finish cleaning up.

### 5.2 — Update `tsconfig.json`

Remove obsolete aliases, keep only the ones that are still useful:

```json
"paths": {
  "@/*":          ["./src/*"],
  "@/app/*":      ["./src/app/*"],
  "@/assets/*":   ["./src/assets/*"],
  "@/features/*": ["./src/features/*"],
  "@/shared/*":   ["./src/shared/*"],
  "@/lib/*":      ["./src/shared/lib/*"],
  "@/types":      ["./src/shared/types/index.ts"],
  "@/types/*":    ["./src/shared/types/*"]
}
```

> We keep `@/lib/*` as a convenience alias: `@/lib/api` is shorter and clearer than
> `@/shared/lib/api`.
> We keep `@/types` and `@/types/*` because they are used everywhere for DTOs.

### 5.3 — Update `vite.config.ts`

Synchronize the `resolve.alias` section in Vite with the tsconfig changes:

```ts
// vite.config.ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "src"),
    "@/app": path.resolve(__dirname, "src/app"),
    "@/features": path.resolve(__dirname, "src/features"),
    "@/shared": path.resolve(__dirname, "src/shared"),
    "@/lib": path.resolve(__dirname, "src/shared/lib"),
    "@/types": path.resolve(__dirname, "src/shared/types/index.ts"),
    "@/assets": path.resolve(__dirname, "src/assets"),
  }
}
```

### 5.4 — Final structure audit

Run a full audit to ensure the structure matches the target:

```bash
# list remaining folders in src/
dir src/ # or Get-ChildItem src/

# There should be no:
# src/entities/
# src/shared/stores/
# src/shared/hooks/
# src/shared/ports/
# src/shared/providers/
```

### 5.5 — Final run of all checks

```bash
npm run typecheck
npm run eslint
npm run stylelint
npm run test
npm run test:e2e
npx prettier --check .
```

Everything should pass green.

### 5.6 — Update README.md

- [ ] Update the project structure section
- [ ] Remove mentions of FSD layers (`entities`, `ports`)
- [ ] Add description of the feature-based approach

## Final structure after all phases

```
src/
  app/                     # bootstrap, ErrorBoundary, global styles
  features/
    auth/                  # API, components, hooks, routes
    game/                  # API, store, ui-store, ports, providers, hooks, components, routes
    game-summary/          # hooks, routes
    joined-game/           # routes
    player/                # types, components, lib, routes
    room/                  # API, store, hooks, types
    settings/              # components, routes
    start/                 # API, components, hooks, lib, routes
    statistics/            # API, components, hooks, lib, routes
  shared/
    ui/                    # UI kit (Button, Overlay, Pagination, Podium, etc.)
    lib/
      api/                 # client.ts, errors.ts, types.ts, index.ts
      error-to-user-message.ts
      parseThrowValue.ts
      player-mappers.ts    # if needed by multiple features
      soundPlayer.ts
      useEventSource.ts
    types/                 # DTO, API contracts
  assets/
```

## Commit message for this phase

```
chore: simplify tsconfig path aliases after feature-based migration
```
