# Sequence Diagrams

## Flow 1: Single Undo — Happy Path (no pending throws)

```
User → KeyboardSection: click Undo button
KeyboardSection → handleUndo(): call

handleUndo():
  check isUndoInFlightRef.current = false → proceed
  check hasPendingThrows() = false → proceed
  await executeUndo()

executeUndo():
  check isUndoInFlightRef.current = false → proceed
  isUndoInFlightRef.current = true               ← guard SET (synchronous)
  setIsUndoPending(true)                         ← NEW: schedules re-render
  currentGameData = $gameData.get()
  optimisticState = applyOptimisticUndo(currentGameData)
  if (optimisticState) → setGameData(optimisticState)  ← immediate UI update
  await undoLastThrow(gameId)                    ← API call

  [React re-render fires: Undo button now disabled via isUndoDisabled]

  undoLastThrow resolves → updatedGameState
  VALIDATE: typeof updatedGameState.activePlayerId === "number"  ← NEW
  → YES → setGameData(updatedGameState)          ← server state replaces optimistic
  → playSound("undo")

  finally:
    isUndoInFlightRef.current = false
    setIsUndoPending(false)                      ← NEW: schedules re-render

  [React re-render fires: Undo button re-enables]
```

---

## Flow 2: Single Undo — Server Returns Invalid State (activePlayerId: null)

```
executeUndo():
  ...
  await undoLastThrow(gameId) → updatedGameState { activePlayerId: null, ... }

  VALIDATE: typeof null !== "number"             ← NEW check fails
  console.error("Undo returned invalid activePlayerId:", null)
  await reconcileGameState("Undo could not be applied. Game state refreshed.")
    → getGameThrows(gameId)                      ← full server fetch
    → setGameData(freshState)                    ← overwrites corrupt optimistic

  [do NOT call setGameData(updatedGameState)]
  [do NOT call playSound("undo")]

  finally:
    isUndoInFlightRef.current = false
    setIsUndoPending(false)
```

---

## Flow 3: Single Undo — API Failure (network error / 5xx)

```
executeUndo():
  ...
  await undoLastThrow(gameId) → throws ApiError

  catch (error):
    console.error("Failed to undo throw:", error)
    await reconcileGameState(...)                ← NEW: restore valid state
    playSound("error")

  finally:
    isUndoInFlightRef.current = false
    setIsUndoPending(false)
```

**Before fix:** optimistic undo state remained in store after failure.
**After fix:** `reconcileGameState` fetches fresh server state, overwriting the stale optimistic state.

---

## Flow 4: Second Rapid Click — Guard Blocks Duplicate Undo

```
Click 1 → handleUndo() → executeUndo() → isUndoInFlightRef.current = true → await undoLastThrow...

[event loop yields — API awaiting]

Click 2 → handleUndo():
  check isUndoInFlightRef.current = true → BLOCKED
  console.warn("Cannot undo: previous undo action is still processing")
  return

[isUndoPending = true → Undo button is DISABLED → visual feedback matches guard state]

undoLastThrow resolves → setGameData → finally: isUndoInFlightRef.current = false, setIsUndoPending(false)
[Undo button re-enables]
```

---

## Flow 5: Undo Requested While Pending Throws in Queue

```
User throws (3 times) → queue has 3 items, drainQueue() running

Click Undo → handleUndo():
  isUndoInFlightRef.current = false → passes
  hasPendingThrows() = true → requestUndoAfterSync()
  pendingUndoRequestRef.current = true
  updateSyncMessage("Applying undo after current throw sync.")
  return  [no isUndoPending = true here — undo not yet executing]

drainQueue() processes all 3 throws...
  finally:
    isDrainingRef.current = false
    pendingUndoRequestRef.current = true AND no sync failure AND queue empty
    pendingUndoRequestRef.current = false
    void executeUndo()                           ← deferred undo fires

executeUndo():
  isUndoInFlightRef.current = false → proceeds
  setIsUndoPending(true)
  [proceeds as Flow 1 / Flow 2 above]
```

---

## Flow 6: Sequential Rapid Clicks — All Undos Exhaust Throw History

```
State: game at start (no throws yet, all players at start score)
isUndoDisabled = true (areAllPlayersAtStartScore = true) → Undo button DISABLED
→ User CANNOT click Undo → no API call → no corruption

State: game in progress, 1 throw made
Click 1 → undo in flight → isUndoPending = true → button DISABLED
Click 2 → ignored (button disabled, no handler fired)

[server responds → isUndoPending = false → button re-enables]
[if server response is invalid → reconcileGameState fixes state]
```

---

## Flow 7: Active Player — No Throws → Empty Slots (display fix)

```
Before fix:
  Active player has currentRoundThrows = []
  → getPlayerThrowsDisplay falls back to last roundHistory entry
  → Shows [25, 25, 25] (previous round) for active player
  → Visually identical to all inactive players → user confused

After fix:
  Active player has currentRoundThrows = [] AND isActive = true
  → getPlayerThrowsDisplay returns empty throw slots
  → Shows [_, _, _] for active player
  → Inactive players still show [25, 25, 25] (correct fallback)
```
