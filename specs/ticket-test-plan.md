# Throw Feature Test Plan

## Application Overview

Comprehensive test plan for the throw feature on `/game/:id`, focused on scoring input, turn progression, bust and checkout behavior, undo flows, and settings-driven throw validation. All scenarios assume a blank/fresh state and deterministic API responses using route mocks as needed.

## Test Scenarios

### 1. Basic Throw Mechanics and Validation

**Seed:** `tests/game/basic-throw.spec.ts`

#### 1.1. Record a single standard throw and update active player state

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Open `/game/{gameId}` with a started game state (2 players, score 301 each, player 1 active, zero throws in current round).
   - expect: Game page renders header controls (Back to Home, Settings), scoreboard, and keypad.
   - expect: Undo button is disabled before any throw is entered.
   - expect: Player 1 is visually marked as the active player.

2. Click keypad button `20` once.
   - expect: A throw request is sent to `POST /api/game/{id}/throw/delta` with value=20 and no double/triple flags.
   - expect: Player 1 score decreases from 301 to 281 after reconciliation.
   - expect: First throw slot for Player 1 displays `20` (or equivalent throw marker).
   - expect: Undo button becomes enabled.

#### 1.2. Apply Double and Triple modifiers as one-shot throw multipliers

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. With fresh game state, click `Double` and then click `20`.
   - expect: Double modifier visibly enters active state before number selection.
   - expect: Throw request payload marks `isDouble=true` and base value=20.
   - expect: Score decreases by 40 points.
   - expect: Double modifier resets to inactive immediately after the throw.

2. With fresh game state, click `Triple` and inspect disabled values, then click `19`.
   - expect: `25` and `0` are disabled while Triple is active.
   - expect: Throw request payload marks `isTriple=true` and base value=19.
   - expect: Score decreases by 57 points.
   - expect: Triple modifier resets to inactive immediately after the throw.

#### 1.3. Complete three throws and switch turn to next active player

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Start with Player 1 active and submit three valid throws (e.g., `20`, `19`, `18`) in sequence.
   - expect: Each throw updates the current round throw display for Player 1 in order.
   - expect: After third throw is reconciled, active player changes from Player 1 to Player 2.
   - expect: Current throw counter resets to 0 for the new active player.
   - expect: Player 1 current throw display is cleared for the new turn and prior throws move to round history display.

#### 1.4. Handle bust when throw would produce invalid remaining score

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Initialize game with Player 1 score set to a bust-prone value (e.g., 10) and keep standard out rules.
   - expect: Player 1 is active and can throw.
   - expect: No bust icon is visible before the throw.

2. Submit a throw that exceeds remaining score (e.g., `20`) or produces a forbidden finish under active out rules.
   - expect: Thrown attempt is marked as bust for that turn.
   - expect: Player score returns to pre-throw score after reconciliation.
   - expect: Bust indicator appears in throw display/history for the busted throw.
   - expect: Turn passes to next eligible player after bust resolution.

#### 1.5. Enforce checkout rules from Settings (Double-out and Triple-out)

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Open Settings overlay, switch to `Double-out`, save, and close overlay.
   - expect: Settings overlay opens with selectable game mode options.
   - expect: Save action persists successfully and overlay closes.
   - expect: Subsequent throw behavior follows Double-out constraints.

2. Set active player to a finishable score (e.g., 20) and throw single `20` under Double-out mode.
   - expect: Single throw to zero is rejected as valid checkout (treated as invalid finish/bust path).
   - expect: Player does not finish the game from an invalid checkout.
   - expect: A valid double checkout (e.g., `D10`) is accepted and can finish player when applicable.

#### 1.6. Undo last throw within current turn

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Submit two valid throws for active player (e.g., `20`, `19`).
   - expect: Undo button is enabled after throws are present.
   - expect: Throw display shows two values in current round.

2. Click Undo once.
   - expect: Request is sent to `DELETE /api/game/{id}/throw`.
   - expect: Most recent throw is removed from current throw display.
   - expect: Score increases by the exact amount of the removed throw.
   - expect: Current throw count decrements by one and active player remains unchanged if turn not ended.

#### 1.7. Undo from finish overlay after a winning throw

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Set active player to a finishable score and submit a valid finishing throw.
   - expect: Finish confirmation overlay appears with `Continue` and `Undo Throw` actions.
   - expect: Winning player is recognized in state and throw input is effectively blocked behind overlay.

2. Click `Undo Throw` in overlay.
   - expect: Finishing throw is reverted via undo flow.
   - expect: Player score returns to pre-finish value.
   - expect: Finish overlay closes or updates to allow continued play.
   - expect: Game remains in started state and throw input is re-enabled.

#### 1.8. Recover from throw conflict by syncing latest server state

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Queue a throw while backend responds with `409 GAME_THROW_NOT_ALLOWED` for `POST /throw/delta`, then provide fresh game snapshot on refetch.
   - expect: Client triggers reconciliation by refetching latest game state.
   - expect: Local pending throw queue is cleared after sync.
   - expect: UI reflects server-authoritative player scores/turn.
   - expect: A user-safe game action error/sync message is shown if implemented by UI.

#### 1.9. Keyboard accessibility for throw input controls

**File:** `tests/game/basic-throw.spec.ts`

**Steps:**

1. Navigate throw controls using keyboard only (Tab/Shift+Tab/Enter/Space).
   - expect: Undo, modifier, and numeric throw controls are reachable and operable from keyboard.
   - expect: Visible focus indicator is present on focused controls.
   - expect: Disabled controls (e.g., invalid values during Triple mode) are not actionable via keyboard.
   - expect: Throw action results are equivalent to mouse interaction.
