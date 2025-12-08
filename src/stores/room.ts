import { atom } from "nanostores";

export interface Invitation {
  gameId: number;
  invitationLink: string;
}

export const $currentGameId = atom<number | null>(null);
export const $invitation = atom<Invitation | null>(null);
export const $lastFinishedGameId = atom<number | null>(null);

export function setCurrentGameId(gameId: number | null): void {
  $currentGameId.set(gameId);
}

export function setInvitation(invitation: Invitation | null): void {
  $invitation.set(invitation);
  if (invitation?.gameId) {
    $currentGameId.set(invitation.gameId);
  }
}

export function setLastFinishedGameId(gameId: number | null): void {
  $lastFinishedGameId.set(gameId);
}

export function getActiveGameId(): number | null {
  return $currentGameId.get() ?? null;
}

export function resetRoomStore(): void {
  $currentGameId.set(null);
  $invitation.set(null);
}
