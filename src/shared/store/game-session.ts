import { atom, computed } from "nanostores";
import type { ReadableAtom } from "nanostores";
import { isRecord } from "@/lib/guards/guards";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import type { CreateGameSettingsPayload, GameSummaryResponse } from "@/types";

export interface Invitation {
  gameId: number;
  invitationLink: string;
}

export interface FinishedGameSummarySnapshot {
  gameId: number;
  summary: GameSummaryResponse;
}

export const GAME_ID_STORAGE_KEY = "darts_current_game_id";
export const INVITATION_STORAGE_KEY = "darts_current_invitation";
export const PRE_CREATE_SETTINGS_STORAGE_KEY = "darts_pre_create_game_settings";

const DEFAULT_PRE_CREATE_GAME_SETTINGS: CreateGameSettingsPayload = {
  startScore: 301,
  doubleOut: false,
  tripleOut: false,
};

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isValidInvitation(value: unknown): value is Invitation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    "number" === typeof value.gameId &&
    Number.isFinite(value.gameId) &&
    "string" === typeof value.invitationLink &&
    value.invitationLink.length > 0
  );
}

function getStoredGameId(): number | null {
  if (!canUseSessionStorage()) {
    return null;
  }

  try {
    const stored = window.sessionStorage.getItem(GAME_ID_STORAGE_KEY);
    if (stored) {
      const parsed = Number(stored);
      return Number.isFinite(parsed) ? parsed : null;
    }
  } catch (error) {
    clientLogger.error("game-session.read-game-id.failed", {
      context: { storageKey: GAME_ID_STORAGE_KEY },
      error,
    });
  }
  return null;
}

function setStoredGameId(gameId: number | null): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    if (gameId !== null) {
      window.sessionStorage.setItem(GAME_ID_STORAGE_KEY, String(gameId));
    } else {
      window.sessionStorage.removeItem(GAME_ID_STORAGE_KEY);
    }
  } catch (error) {
    clientLogger.error("game-session.persist-game-id.failed", {
      context: { gameId, storageKey: GAME_ID_STORAGE_KEY },
      error,
    });
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
    clientLogger.error("game-session.read-invitation.failed", {
      context: { storageKey: INVITATION_STORAGE_KEY },
      error,
    });
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
    clientLogger.error("game-session.persist-invitation.failed", {
      context: { storageKey: INVITATION_STORAGE_KEY, invitation },
      error,
    });
    return;
  }
}

function isValidPreCreateGameSettings(value: unknown): value is CreateGameSettingsPayload {
  if (!isRecord(value)) {
    return false;
  }

  return (
    "number" === typeof value.startScore &&
    Number.isFinite(value.startScore) &&
    "boolean" === typeof value.doubleOut &&
    "boolean" === typeof value.tripleOut
  );
}

function getStoredPreCreateGameSettings(): CreateGameSettingsPayload {
  if (!canUseSessionStorage()) {
    return DEFAULT_PRE_CREATE_GAME_SETTINGS;
  }

  try {
    const stored = window.sessionStorage.getItem(PRE_CREATE_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PRE_CREATE_GAME_SETTINGS;
    }

    const parsed: unknown = JSON.parse(stored);
    return isValidPreCreateGameSettings(parsed) ? parsed : DEFAULT_PRE_CREATE_GAME_SETTINGS;
  } catch (error) {
    clientLogger.error("game-session.read-pre-create-settings.failed", {
      context: { storageKey: PRE_CREATE_SETTINGS_STORAGE_KEY },
      error,
    });
    return DEFAULT_PRE_CREATE_GAME_SETTINGS;
  }
}

function setStoredPreCreateGameSettings(settings: CreateGameSettingsPayload): void {
  if (!canUseSessionStorage()) {
    return;
  }

  try {
    window.sessionStorage.setItem(PRE_CREATE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    clientLogger.error("game-session.persist-pre-create-settings.failed", {
      context: { storageKey: PRE_CREATE_SETTINGS_STORAGE_KEY, settings },
      error,
    });
  }
}

const currentGameIdAtom = atom<number | null>(getStoredGameId());
const invitationAtom = atom<Invitation | null>(getStoredInvitation());
const lastFinishedGameSummaryAtom = atom<FinishedGameSummarySnapshot | null>(null);
const preCreateGameSettingsAtom = atom<CreateGameSettingsPayload>(getStoredPreCreateGameSettings());

export const $currentGameId: ReadableAtom<number | null> = currentGameIdAtom;
export const $invitation: ReadableAtom<Invitation | null> = invitationAtom;
export const $lastFinishedGameSummary: ReadableAtom<FinishedGameSummarySnapshot | null> =
  lastFinishedGameSummaryAtom;
export const $lastFinishedGameId = computed(
  lastFinishedGameSummaryAtom,
  (snapshot) => snapshot?.gameId ?? null,
);
export const $preCreateGameSettings: ReadableAtom<CreateGameSettingsPayload> =
  preCreateGameSettingsAtom;

export const testOnlyCurrentGameIdAtom = currentGameIdAtom;

/**
 * Sets the current game id and persists it in session storage.
 */
export function setCurrentGameId(gameId: number | null): void {
  if (currentGameIdAtom.get() === gameId) {
    return;
  }

  currentGameIdAtom.set(gameId);
  setStoredGameId(gameId);
}

/**
 * Stores the current invitation and updates the game id if provided.
 */
export function setInvitation(invitation: Invitation | null): void {
  const current = invitationAtom.get();
  const invitationUnchanged =
    current?.gameId === invitation?.gameId &&
    current?.invitationLink === invitation?.invitationLink;

  if (!invitationUnchanged) {
    invitationAtom.set(invitation);
    setStoredInvitation(invitation);
  }

  if (invitation?.gameId) {
    setCurrentGameId(invitation.gameId);
  }
}

/**
 * Stores the latest finished game summary for the current SPA navigation flow.
 */
export function setLastFinishedGameSummary(snapshot: FinishedGameSummarySnapshot | null): void {
  lastFinishedGameSummaryAtom.set(snapshot);
}

/**
 * Stores the draft settings used before a room exists.
 */
export function setPreCreateGameSettings(settings: CreateGameSettingsPayload): void {
  preCreateGameSettingsAtom.set(settings);
  setStoredPreCreateGameSettings(settings);
}

/**
 * Resets the pre-create settings draft to defaults.
 */
export function resetPreCreateGameSettings(): void {
  setPreCreateGameSettings(DEFAULT_PRE_CREATE_GAME_SETTINGS);
}

/**
 * Reads the currently active game id from the store.
 */
export function getActiveGameId(): number | null {
  return currentGameIdAtom.get();
}

/**
 * Clears room-related store state and persisted game id.
 */
export function resetRoomStore(): void {
  setCurrentGameId(null);
  setInvitation(null);
}
