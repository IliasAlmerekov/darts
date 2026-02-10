import { atom } from "nanostores";

export interface Invitation {
  gameId: number;
  invitationLink: string;
}

const STORAGE_KEY = "darts_current_game_id";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

// Helper functions for sessionStorage (cleared when browser closes)
function getStoredGameId(): number | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch (error) {
    console.error("Failed to read game ID from sessionStorage:", error);
  }
  return null;
}

function setStoredGameId(gameId: number | null): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    if (gameId !== null) {
      window.sessionStorage.setItem(STORAGE_KEY, String(gameId));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to save game ID to sessionStorage:", error);
  }
}

// Initialize stores with persisted value
export const $currentGameId = atom<number | null>(getStoredGameId());
export const $invitation = atom<Invitation | null>(null);
export const $lastFinishedGameId = atom<number | null>(null);

/**
 * Sets the current game id and persists it in session storage.
 */
export function setCurrentGameId(gameId: number | null): void {
  $currentGameId.set(gameId);
  setStoredGameId(gameId);
}

/**
 * Stores the current invitation and updates the game id if provided.
 */
export function setInvitation(invitation: Invitation | null): void {
  $invitation.set(invitation);
  if (invitation?.gameId) {
    setCurrentGameId(invitation.gameId);
  }
}

/**
 * Stores the last finished game id for navigation/summary flows.
 */
export function setLastFinishedGameId(gameId: number | null): void {
  $lastFinishedGameId.set(gameId);
}

/**
 * Reads the currently active game id from the store.
 */
export function getActiveGameId(): number | null {
  return $currentGameId.get() ?? null;
}

/**
 * Clears room-related store state and persisted game id.
 */
export function resetRoomStore(): void {
  setCurrentGameId(null);
  $invitation.set(null);
}
