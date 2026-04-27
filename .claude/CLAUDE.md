# Darts App - Claude Code Context

## Source Of Truth

Before implementing any change, Claude Code and all subagents must read and follow:

```text
docs/convention/coding-standards.md
```

`CLAUDE.md` is context-only. It does not define coding rules, exceptions, quality gates, or
additional process requirements. If anything here differs from the coding standards, follow
the coding standards.

## Project

PWA darts game with room creation, SSE real-time throw streaming, and player statistics.

For fast navigation, start with:

```text
docs/repo-map.md
```

The authoritative `src/` layout is defined in:

```text
docs/convention/architecture.md
```

## Claude Code Orchestration

The active Claude Code chat is the lead orchestrator.

Do not create, register, or delegate to a separate `lead_orchestrator`, `lead-orchestrator`,
or "lead orchestrator" subagent. The chat agent owns:

- Reading the relevant command in `.claude/commands/`
- Selecting and scoping subagents
- Merging subagent outputs
- Enforcing human approval gates
- Deciding when to stop and return control to the developer

## Slash Commands

Use `.claude/commands/` as the command entrypoints:

- `/research_codebase` creates `docs/{feature-slug}/research/research.md`
- `/design_feature` reads the research file, creates `docs/{feature-slug}/design/design.md`,
  then waits for human approval
- `/design_feature` after approval creates `docs/{feature-slug}/plan/plan.md` and optional
  `stage-XX.md` files
- `/implement_feature` reads a plan or stage file and runs the bounded implementation loop
- `/test_driven_development` is for small or medium changes that do not need the full workflow

## Subagent Models

Claude Code subagents must declare their model in frontmatter.

Use these repository defaults:

- `researcher`: `haiku`
- `explorer`: `haiku`
- `architect`: `sonnet`
- `coder`: `opus`
- `tester`: `sonnet`
- `security`: `sonnet`
- `reviewer`: `sonnet`

## Multi-Agent Workflow

### Research

Goal: reduce a large codebase to the minimum relevant file set for the task.

The active chat launches parallel `researcher` subagents when useful. Each researcher studies
one slice such as architecture, domain models, integrations, tests, or security-sensitive
paths.

Output:

```text
docs/{feature-slug}/research/research.md
```

The research artifact must contain dry facts only: what exists, where it is, and what was
verified. It must not include opinions, guesses, refactoring advice, or implementation plans.

### Design

Input:

```text
docs/{feature-slug}/research/research.md
```

Output before approval:

```text
docs/{feature-slug}/design/design.md
```

The design artifact is limited to:

- Data Flow Diagram
- Sequence Diagram

After writing the design, stop and wait for explicit human approval.

### Planning

Planning starts only after the human approves the design.

Output:

```text
docs/{feature-slug}/plan/plan.md
```

If needed, split the work into stage files:

```text
docs/{feature-slug}/plan/stage-01.md
docs/{feature-slug}/plan/stage-02.md
```

Split stages when a single plan would be too broad and likely to lose precision.

### Implementation

Input:

```text
docs/{feature-slug}/plan/plan.md
```

or:

```text
docs/{feature-slug}/plan/stage-XX.md
```

The active chat runs at most three cycles:

1. `coder` implements and updates tests.
2. `tester` checks coverage and verification.
3. `security` checks security risks.
4. `reviewer` checks coding standards and plan compliance.

If there is a blocker, return to `coder`. After three cycles, stop and return control to the
human developer with the remaining blockers and recommended next decision.

## Documentation

When unsure about the API or behavior of any library in this project, fetch up-to-date docs via
Context7 before writing code:

```text
mcp__context7__resolve-library-id -> mcp__context7__query-docs
```

Use this for React, React Router, Nanostores, Vitest, Testing Library, Playwright, Vite,
TypeScript, and any other dependency where API accuracy matters.

## Hard Safety Rules

Agents must not:

- Read production secrets.
- Paste `.env` values into prompts, logs, commits, or issue comments.
- Push directly to `main`.
- Add `Co-Authored-By:` (or `Co-authored-by:`) trailers to commit messages, PR
  descriptions, or any other git metadata. Commits are authored by the human
  developer only.
- Disable auth, validation, CSRF, or authorization checks.
- Change permissions, roles, tokens, credentials, or access policy without human approval.
- Run destructive commands without human approval.
- Install random packages or change dependencies without a clear reason and human approval.
- Create, edit, or run database migrations without human approval.
- Send code, logs, traces, secrets, or project files to external services without explicit
  permission.

## Tech Stack

- Runtime/UI: React 18
- Language: TypeScript 5.8
- Build: Vite 7
- Routing: React Router 6
- State: Nanostores
- Styling: CSS Modules
- Testing: Vitest, Testing Library, Playwright

## Project Structure

```text
src/
  app/         # bootstrap, providers, router, global guards, error boundaries
  assets/      # static assets imported by code
  pages/       # route-level components
  shared/      # api client, utilities, hooks, types, shared UI kit
  test/        # test-only helpers, architecture tests, Vitest setup
  index.tsx    # app entry
  vite-env.d.ts
```

## Verification Commands

Repository validation is enforced by the pre-push hook via `npm run validate:push`.

Standard local commands:

```bash
npm run build
npm run eslint
npm run stylelint
npm run prettier:check
npm run test
npm run typecheck
npm run secrets:check
```

Run `npm run test:e2e` when touching browser flows, routing, auth, responsive behavior, or
Playwright-covered user journeys.

## Ticket-Driven Source Of Truth

- If a ticket limits the source of truth to a specific file list, use only those files.
- If a ticket requires literal-value inventory before implementation, do not infer missing
  members from the ticket text or from other files.
