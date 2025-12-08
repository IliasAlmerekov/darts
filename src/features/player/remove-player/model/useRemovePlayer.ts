import { useLeaveRoom } from "@/features/room/leave-room";

export function useRemovePlayer() {
  // Delegates to leave-room feature for semantic clarity.
  return useLeaveRoom();
}
