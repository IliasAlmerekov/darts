# Pages-based structure

Status: accepted.

The code had settled on a pages-based layout, and `docs/convention/architecture.md` wrote down its rules, but no document said why the project uses it. Without the reason, every new contributor who knows Feature-Sliced Design or a classic MVC layout has to guess whether the structure is deliberate.

The app runs on one tablet for darts games inside one company, with a small number of players. It has eleven route-level pages and one backend. So `src/` has three layers with imports in one direction, `app → pages → shared`. A page owns its components, hooks and helpers in its own folder, and code that two or more pages use moves to `shared/`. A developer who opens the project finds a screen's code by its page name, and the structure has nothing more to learn.

## Considered options

- Feature-Sliced Design, with `entities/`, `features/` and `widgets/` between pages and shared. Rejected: for an app of this size, each feature would be split across slices and segments that exist only to follow the method. Finding a component would mean knowing where FSD files it, not which screen shows it.
- MVC with separate model, view and controller folders. Rejected: React components hold their view and their behaviour together, TanStack Query holds server state (ADR 0001), and Nanostores hold client state. A controller layer would have nothing to own.

## Consequences

- `docs/convention/architecture.md` holds the rules: allowed folders, the dependency direction that ESLint enforces, and the public surface of each `shared/` module.
- A new screen is a new folder under `src/pages/`. A new top-level folder such as `src/features/` needs a new ADR that replaces this one.
- If the app grows past one tablet and one company, revisit this choice.
