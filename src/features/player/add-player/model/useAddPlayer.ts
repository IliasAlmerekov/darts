import { useJoinRoom } from "@/features/room/join-room";

export function useAddPlayer() {
  // Delegates to join-room feature; semantically used for "adding" a player via invite.
  return useJoinRoom();
}
