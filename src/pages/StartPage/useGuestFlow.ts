import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/shared/api";
import { addGuestPlayer } from "@/shared/api/room";
import { validateGuestUsername } from "./lib/guestUsername";
import type { AddGuestErrorResponse } from "@/types";

const MAX_LOBBY_PLAYERS = 10;

type OptimisticGuestPlayer = {
  id: number;
  name: string;
  position?: number | null;
};

type UseGuestFlowParams = {
  gameId: number | null;
  playerCount: number;
  appendOptimisticPlayer: (player: OptimisticGuestPlayer) => void;
};

export type UseGuestFlowResult = {
  isLobbyFull: boolean;
  isGuestOverlayOpen: boolean;
  guestUsername: string;
  guestError: string | null;
  guestSuggestions: string[];
  isAddingGuest: boolean;
  openGuestOverlay: () => void;
  closeGuestOverlay: () => void;
  setGuestUsername: (value: string) => void;
  handleGuestSuggestion: (suggestion: string) => void;
  handleAddGuest: () => Promise<void>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAddGuestErrorResponse(data: unknown): data is AddGuestErrorResponse {
  if (!isRecord(data)) {
    return false;
  }

  return (
    data.success === false &&
    data.error === "USERNAME_TAKEN" &&
    typeof data.message === "string" &&
    (data.suggestions === undefined ||
      (Array.isArray(data.suggestions) &&
        data.suggestions.every((suggestion) => typeof suggestion === "string")))
  );
}

function getGuestErrorFromApi(error: unknown): AddGuestErrorResponse | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }

  const data = error.data;
  return isAddGuestErrorResponse(data) ? data : null;
}

/**
 * Manages guest player overlay state, validation, and guest creation.
 */
export function useGuestFlow({
  gameId,
  playerCount,
  appendOptimisticPlayer,
}: UseGuestFlowParams): UseGuestFlowResult {
  const [isGuestOverlayOpen, setIsGuestOverlayOpen] = useState(false);
  const [guestUsername, setGuestUsernameState] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSuggestions, setGuestSuggestions] = useState<string[]>([]);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const addGuestInFlightRef = useRef(false);
  const isLobbyFull = playerCount >= MAX_LOBBY_PLAYERS;

  const openGuestOverlay = useCallback((): void => {
    if (isLobbyFull) {
      setGuestError("The lobby is full. Remove a player to add another.");
      return;
    }

    setGuestError(null);
    setGuestSuggestions([]);
    setIsGuestOverlayOpen(true);
  }, [isLobbyFull]);

  const closeGuestOverlay = useCallback((): void => {
    setIsGuestOverlayOpen(false);
    setGuestUsernameState("");
    setGuestError(null);
    setGuestSuggestions([]);
  }, []);

  const handleGuestUsernameChange = useCallback(
    (value: string): void => {
      setGuestUsernameState(value);
      if (guestError) {
        setGuestError(null);
      }
      if (guestSuggestions.length > 0) {
        setGuestSuggestions([]);
      }
    },
    [guestError, guestSuggestions.length],
  );

  const handleGuestSuggestion = useCallback((suggestion: string): void => {
    setGuestUsernameState(suggestion);
    setGuestError(null);
    setGuestSuggestions([]);
  }, []);

  const handleAddGuest = useCallback(async (): Promise<void> => {
    if (!gameId) {
      setGuestError("Please create a game first.");
      return;
    }

    if (isLobbyFull) {
      setGuestError("The lobby is full. Remove a player to add another.");
      return;
    }

    if (addGuestInFlightRef.current) {
      return;
    }

    const trimmedUsername = guestUsername.trim();
    const validationError = validateGuestUsername(trimmedUsername);
    if (validationError) {
      setGuestError(validationError);
      return;
    }

    addGuestInFlightRef.current = true;
    setIsAddingGuest(true);
    setGuestError(null);
    setGuestSuggestions([]);

    try {
      const guestPlayer = await addGuestPlayer(gameId, { username: trimmedUsername });
      appendOptimisticPlayer(guestPlayer);
      closeGuestOverlay();
    } catch (error) {
      const apiError = getGuestErrorFromApi(error);
      if (apiError) {
        setGuestError(apiError.message || "Username already taken in this game.");
        setGuestSuggestions(apiError.suggestions ?? []);
        return;
      }

      setGuestError("Could not add guest. Please try again.");
    } finally {
      addGuestInFlightRef.current = false;
      setIsAddingGuest(false);
    }
  }, [appendOptimisticPlayer, closeGuestOverlay, gameId, guestUsername, isLobbyFull]);

  return {
    isLobbyFull,
    isGuestOverlayOpen,
    guestUsername,
    guestError,
    guestSuggestions,
    isAddingGuest,
    openGuestOverlay,
    closeGuestOverlay,
    setGuestUsername: handleGuestUsernameChange,
    handleGuestSuggestion,
    handleAddGuest,
  };
}
