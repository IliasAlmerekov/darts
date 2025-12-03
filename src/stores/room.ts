import { atom } from "nanostores";
import { persistInvitationToStorage, readInvitationFromStorage } from "../hooks/useRoomInvitation";

export interface Invitation {
  gameId: number;
  invitationLink: string;
}

const initialInvitation = readInvitationFromStorage();

export const $currentGameId = atom<number | null>(initialInvitation?.gameId ?? null);
export const $invitation = atom<Invitation | null>(initialInvitation);
export const $lastFinishedGameId = atom<number | null>(null);

export function setCurrentGameId(gameId: number | null): void {
  $currentGameId.set(gameId);
}

export function setInvitation(invitation: Invitation | null): void {
  $invitation.set(invitation);
  persistInvitationToStorage(invitation);
  if (invitation?.gameId) {
    $currentGameId.set(invitation.gameId);
  }
}

export function setLastFinishedGameId(gameId: number | null): void {
  $lastFinishedGameId.set(gameId);
}

export function getActiveGameId(): number | null {
  return $currentGameId.get() ?? readInvitationFromStorage()?.gameId ?? null;
}

export function resetRoomStore(): void {
  $currentGameId.set(null);
  $invitation.set(null);
  persistInvitationToStorage(null);
}
