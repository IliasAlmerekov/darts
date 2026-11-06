import { useCallback, useRef, useState } from "react";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import type { AddGuestResult } from "../roster/useRoster";
import { useIsCurrentGame } from "../lib/useIsCurrentGame";
import { validateGuestUsername } from "./guestUsername";

const MAX_LOBBY_PLAYERS = 10;
const LOBBY_FULL_MESSAGE = "The lobby is full. Remove a player to add another.";

interface UseGuestFlowParams {
  gameId: number | null;
  playerCount: number;
  addGuest: (username: string) => Promise<AddGuestResult>;
}

export interface UseGuestFlowResult {
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
}

/**
 * Manages guest player overlay state, validation, and guest creation.
 */
export function useGuestFlow({
  gameId,
  playerCount,
  addGuest,
}: UseGuestFlowParams): UseGuestFlowResult {
  const [isGuestOverlayOpen, setIsGuestOverlayOpen] = useState(false);
  const [guestUsername, setGuestUsernameState] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSuggestions, setGuestSuggestions] = useState<string[]>([]);
  const [isAddingGuest, setIsAddingGuest] = useState(false);
  const addGuestInFlightRef = useRef(false);
  const isCurrentGame = useIsCurrentGame(gameId);
  const isLobbyFull = playerCount >= MAX_LOBBY_PLAYERS;

  const openGuestOverlay = useCallback((): void => {
    if (isLobbyFull) {
      setGuestError(LOBBY_FULL_MESSAGE);
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
    if (gameId === null) {
      setGuestError("Please create a game first.");
      return;
    }

    if (isLobbyFull) {
      setGuestError(LOBBY_FULL_MESSAGE);
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
      const result = await addGuest(trimmedUsername);
      switch (result.status) {
        case "added":
          if (isCurrentGame(gameId)) closeGuestOverlay();
          return;
        case "stale":
          // The route moved to another game while the request ran: its answer is not for this page.
          return;
        case "seats-not-editable":
        case "lobby-full":
          setGuestError(toUserErrorMessage(result.error));
          return;
        case "username-taken":
          setGuestError(result.message || "Username already taken in this game.");
          setGuestSuggestions(result.suggestions);
          return;
        case "failed":
          setGuestError("Could not add guest. Please try again.");
          return;
      }
    } finally {
      addGuestInFlightRef.current = false;
      setIsAddingGuest(false);
    }
  }, [addGuest, closeGuestOverlay, gameId, guestUsername, isLobbyFull, isCurrentGame]);

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
