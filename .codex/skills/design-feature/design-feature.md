# Design Feature

Short phase card for Design and post-approval Planning.

The complete skill instruction is in [SKILL.md](SKILL.md). When Design starts, read `SKILL.md` first and follow it as the source of truth: it defines the Typora-compatible diagram-only design contract, Human-in-the-Loop gate, and planning file rules.

## Goal

Turn `docs/{feature-slug}/research/research.md` into a minimal diagram-only design that renders visually in Typora when Markdown diagrams are enabled.

## Input

The agent receives the research artifact created by the Research phase:

```text
docs/{feature-slug}/research/research.md
```

## Design Result

```text
docs/{feature-slug}/design/design.md
```

The design artifact pairs the data flow and runtime views with the C4 model for visualising software architecture, and contains the design only as:

- `## Data Flow` with exactly one Typora-compatible Mermaid `graph LR` or `graph TD`, plus a `### Why` rationale block.
- `## Sequence Diagram` with exactly one Mermaid `sequenceDiagram`, plus a `### Why` rationale block.
- `## C4 Context` (Level 1) with exactly one Mermaid `C4Context`, plus a `### Why` rationale block.
- `## C4 Container` (Level 2) with exactly one Mermaid `C4Container`, plus a `### Why` rationale block.
- `## C4 Component` (Level 3) with exactly one Mermaid `C4Component`, plus a `### Why` rationale block.

Each `### Why` block is 2–5 short sentences that justify the chosen nodes, boundaries, containers, components, or participants by citing facts from `research.md` (using the `path:line` style). Rationale must stay decision-focused and must not propose new APIs, files, refactors, alternatives, or testing strategy.

No implementation plan, architecture prose, refactoring advice, tables, file inventories, stage notes, screenshots, ASCII diagrams, or production code belongs in `design.md`. Keep diagrams compact enough to read: include only primary boundaries, system context, containers, key components, state transitions, external contracts, and user-visible branches.

## Human Gate

After writing `design.md`, the agent must stop and wait for explicit human approval. Planning starts only after approval.

## Planning Result

```text
docs/{feature-slug}/plan/plan.md
```

If needed, planning is split into multiple small stage files under `docs/{feature-slug}/plan/` to keep each implementation step narrow, verifiable, and less likely to hallucinate.
