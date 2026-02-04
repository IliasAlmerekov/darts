# Dart score app

Dart score app is an app where you can effortlessly keep track of your dart games.

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Install dependencies:

```bash
 npm install
```

## Getting Started

```bash
npm run dev
```

## Environment

Create a `.env` file in the project root using `.env.example` as a template.

## Architecture (FSD)

This project follows Feature-Sliced Design (FSD). The key idea is to separate code by responsibility and prevent cross-feature coupling.

Layers overview:

- `app/` — application bootstrap, providers, global styles
- `entities/` — domain entities and core models
- `features/` — business features (main development unit)
- `shared/` — shared UI, hooks, lib utilities, types, and stores

Rules:

- Do not import internals of another feature. Only import from `features/<feature>/index.ts`.
- Shared logic should live in `shared/`, not duplicated across features.

## Directory structure

```bash
└───src
    ├───app
    │   └───styles
    ├───assets
    │   ├───fonts
    │   │   └───circularXX
    │   └───icons
    ├───entities
    ├───features
    └───shared
```

## Common Commit Types (Conventional Commits)

Use the following types for your commit messages:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation changes only
- **style**: Code style changes (formatting, no logic changes)
- **refactor**: Code restructuring without changing functionality
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (e.g., configs, build tools)
