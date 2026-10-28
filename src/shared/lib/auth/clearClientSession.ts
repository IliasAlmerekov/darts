import { queryClient } from "@/shared/query/queryClient";
import { resetRoomStore } from "@/shared/store/game-session";
import { resetGameStore } from "@/shared/store/game-state";

/**
 * Drops everything the client holds for the current session: cached reads, the room
 * store with its stored game id, and the game store. Logout and the 401 handler share it.
 */
export function clearClientSession(): void {
  queryClient.clear();
  resetRoomStore();
  resetGameStore();
}
