import { atom } from "nanostores";

export interface Invitation {
  gameId: number;
  invitationLink: string;
}

const STORAGE_KEY = "darts_current_game_id";
const INVITATION_STORAGE_KEY = "darts_current_invitation";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isValidInvitation(value: unknown): value is Invitation {
  if (null === value || "object" !== typeof value) {
    return false;
  }

  const typed = value as Partial<Invitation>;
  return (
    "number" === typeof typed.gameId &&
    Number.isFinite(typed.gameId) &&
    "string" === typeof typed.invitationLink &&
    typed.invitationLink.length > 0
  );
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

function getStoredInvitation(): Invitation | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(INVITATION_STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);
    return isValidInvitation(parsed) ? parsed : null;
  } catch (error) {
    console.error("Failed to read invitation from sessionStorage:", error);
    return null;
  }
}

function setStoredInvitation(invitation: Invitation | null): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    if (invitation) {
      window.sessionStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify(invitation));
    } else {
      window.sessionStorage.removeItem(INVITATION_STORAGE_KEY);
    }
  } catch (error) {
    console.error("Failed to save invitation to sessionStorage:", error);
  }
}

// Initialize stores with persisted value
export const $currentGameId = atom<number | null>(getStoredGameId());
export const $invitation = atom<Invitation | null>(getStoredInvitation());
export const $lastFinishedGameId = atom<number | null>(null);

/**
 * Sets the current game id and persists it in session storage.
 */
export function setCurrentGameId(gameId: number | null): void {
  if ($currentGameId.get() === gameId) {
    return;
  }

  $currentGameId.set(gameId);
  setStoredGameId(gameId);
}

/**
 * Stores the current invitation and updates the game id if provided.
 */
export function setInvitation(invitation: Invitation | null): void {
  const current = $invitation.get();
  const invitationUnchanged =
    current?.gameId === invitation?.gameId &&
    current?.invitationLink === invitation?.invitationLink;

  if (!invitationUnchanged) {
    $invitation.set(invitation);
    setStoredInvitation(invitation);
  }

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
  setInvitation(null);
}
