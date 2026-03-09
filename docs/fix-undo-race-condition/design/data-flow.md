# Data Flow

## Decision: Sync vs Async

Undo is an async operation: optimistic update applied synchronously, then server call made. No SSE involvement. This matches the existing pattern for throw submission.

---

## Happy Path — Undo with valid server response

```
User clicks Undo
  → handleUndo()
  → executeUndo()
        → (sync) isUndoInFlightRef.current = true; setIsUndoPending(true)
        → (sync) applyOptimisticUndo($gameData.get())
              → clones players
              → removes last throw from activePlayer.currentRoundThrows
              → restores score
              → returns GameThrowsResponse (or null if no throws)
        → if (optimisticState) setGameData(optimisticState)
              → normalizeGameData(optimisticState) written to $gameData atom
              → Nanostore notifies subscribers → React schedules re-render
              → UI shows updated score immediately
        → await undoLastThrow(gameId)     DELETE /game/{id}/throw
        → server returns GameThrowsResponse with correct activePlayerId (number)
        → VALIDATE: typeof activePlayerId === "number" && Number.isFinite(activePlayerId)
        → setGameData(serverResponse)
              → normalizeGameData(serverResponse) written to $gameData atom
              → React re-renders with authoritative server state
        → playSound("undo")
        → finally: isUndoInFlightRef.current = false; setIsUndoPending(false)
              → React re-renders: Undo button re-enables
```

**Expected latency:** optimistic update < 1ms (sync); server response 50–500ms.
**Loading state:** button disabled via `isUndoPending`; score shown optimistically.

---

## Error Path 1: Server returns invalid state (activePlayerId null/non-number)

```
await undoLastThrow(gameId) → GameThrowsResponse { activePlayerId: null, ... }

VALIDATE → fails (null is not a number)
console.error("Undo returned invalid activePlayerId:", null)

await reconcileGameState("Undo could not be applied. Game state refreshed.")
  → getGameThrows(gameId, { signal })    GET /game/{id}/throws
  → setGameData(freshState)              ← authoritative state overwrites optimistic
  → syncMessage set ("Undo could not be applied. Game state refreshed.")

[setGameData(serverResponse) is NOT called — bad state not stored]
playSound NOT called — no "undo" sound for failed undo

finally: isUndoInFlightRef.current = false; setIsUndoPending(false)
```

---

## Error Path 2: API failure (network error, 5xx)

```
await undoLastThrow(gameId) → throws ApiError / NetworkError

catch (error):
  console.error("Failed to undo throw:", error)
  await reconcileGameState("Undo failed. Game state refreshed.")
    → getGameThrows(gameId, { signal })
    → setGameData(freshState)            ← RESTORES valid state, overwrites optimistic undo
  playSound("error")

finally: isUndoInFlightRef.current = false; setIsUndoPending(false)
```

**Before fix:** optimistic undo state was NOT restored on failure — score shown as undone even though server rejected.
**After fix:** reconcileGameState fetches fresh state, score restored to correct value.

---

## State Mutation Summary

| Event                     | Who mutates                                   | What changes in $gameData                                                | React re-render triggered |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------ | ------------------------- |
| Optimistic undo           | `executeUndo` → `setGameData`                 | `activePlayer.currentRoundThrows` reduced; `activePlayer.score` restored | YES                       |
| Button disabled           | `setIsUndoPending(true)`                      | (separate React state)                                                   | YES — button disables     |
| Server response (valid)   | `executeUndo` → `setGameData`                 | Full replacement with server state                                       | YES                       |
| Server response (invalid) | NOT set; `reconcileGameState` → `setGameData` | Full replacement with reconciled state                                   | YES                       |
| API failure               | `reconcileGameState` → `setGameData`          | Full replacement with fresh state                                        | YES                       |
| Button re-enabled         | `setIsUndoPending(false)`                     | (separate React state)                                                   | YES — button re-enables   |

---

## `isUndoDisabled` Derivation (updated)

```
isUndoDisabled =
  isLoading                    (fetch in progress)
  OR hasError                  (game load error)
  OR !gameData                 (no game data)
  OR shouldShowFinishOverlay   (game finished, overlay shown)
  OR isUndoPending             (undo API call in-flight)     ← NEW
  OR areAllPlayersAtStartScore (no throws to undo)
```

All inputs are React-state-derived (re-render-safe). `isUndoPending` is new React state from `useUndoFlow`.

---

## `getPlayerThrowsDisplay` Logic (updated)

```
Input: player (with currentRoundThrows, roundHistory, isActive), pendingThrows, ...

if (player.currentRoundThrows.length > 0):
  → display currentRoundThrows (unchanged)

elif (player.isActive):
  → display empty throw slots [null, null, null]    ← NEW: no fallback for active player

else:
  → display last roundHistory entry (fallback for inactive players — unchanged)
```
