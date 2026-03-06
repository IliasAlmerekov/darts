# Verification Matrix

| Phase | Title                          | Files Changed                                                                | Required Checks                   | Agent Pipeline                       |
| ----- | ------------------------------ | ---------------------------------------------------------------------------- | --------------------------------- | ------------------------------------ |
| 01    | Hook — reconnect logic + tests | `src/shared/hooks/useRoomStream.ts` `src/shared/hooks/useRoomStream.test.ts` | typecheck, eslint, test, prettier | coder → reviewer → security → tester |

## Notes

- **No stylelint** — no CSS changes in any phase
- **No E2E** — change is internal resilience; no critical user journey UI affected
- **Single phase** — no inter-phase dependencies to track
