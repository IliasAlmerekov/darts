# Design Feature

Short phase card for Design and post-approval Planning.

The complete skill instruction is in [SKILL.md](SKILL.md). When Design starts, read `SKILL.md` first and follow it as the source of truth: it defines the diagram-only design contract, Human-in-the-Loop gate, and planning file rules.

## Goal

Turn `docs/{feature-slug}/research/research.md` into a minimal diagram-only design.

## Input

The agent receives the research artifact created by the Research phase:

```text
docs/{feature-slug}/research/research.md
```

## Design Result

```text
docs/{feature-slug}/design/design.md
```

The design artifact must contain the design only as:

- Data Flow Diagram.
- Sequence Diagram.

No implementation plan, architecture prose, refactoring advice, or production code belongs in `design.md`.

## Human Gate

After writing `design.md`, the agent must stop and wait for explicit human approval. Planning starts only after approval.

## Planning Result

```text
docs/{feature-slug}/plan/plan.md
```

If needed, planning is split into multiple small stage files under `docs/{feature-slug}/plan/` to keep each implementation step narrow, verifiable, and less likely to hallucinate.
