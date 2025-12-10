import { atom } from "nanostores";

export interface Invitation {
  gameId: number;
  invitationLink: string;
}

const STORAGE_KEY = "darts_current_game_id";

// Helper functions for localStorage
function getStoredGameId(): number | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch (error) {
    console.error("Failed to read game ID from localStorage:", error);
  }
  return null;
}

function setStoredGameId(gameId: number | null): void {
  try {
    if (gameId !== null) {
      localStorage.setItem(STORAGE_KEY, String(gameId));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to save game ID to localStorage:", error);
  }
}

// Initialize stores with persisted value
export const $currentGameId = atom<number | null>(getStoredGameId());
export const $invitation = atom<Invitation | null>(null);
export const $lastFinishedGameId = atom<number | null>(null);

export function setCurrentGameId(gameId: number | null): void {
  $currentGameId.set(gameId);
  setStoredGameId(gameId);
}

export function setInvitation(invitation: Invitation | null): void {
  $invitation.set(invitation);
  if (invitation?.gameId) {
    setCurrentGameId(invitation.gameId);
  }
}

export function setLastFinishedGameId(gameId: number | null): void {
  $lastFinishedGameId.set(gameId);
}

export function getActiveGameId(): number | null {
  return $currentGameId.get() ?? null;
}

export function resetRoomStore(): void {
  setCurrentGameId(null);
  $invitation.set(null);
}
