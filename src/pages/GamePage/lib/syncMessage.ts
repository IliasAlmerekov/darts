import type { SyncStatus } from "./gameSession.logic";

export function getSyncMessage(syncStatus: SyncStatus, isQueueFull: boolean): string | null {
  if (syncStatus === "failed" || syncStatus === "offline") {
    return "Your last throws were not saved.";
  }

  if (syncStatus === "loadFailed") {
    return "Could not load the game.";
  }

  return isQueueFull ? "Syncing throws…" : null;
}
