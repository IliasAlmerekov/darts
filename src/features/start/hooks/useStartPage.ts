import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useGamePlayers } from "@/hooks/useGamePlayers";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";
import type { AddGuestErrorResponse } from "@/shared/ports/game-flow";
import {
  $lastFinishedGameId,
  $invitation,
  $gameSettings,
  $currentGameId,
  setCurrentGameId,
  setInvitation,
} from "@/stores";
import { setGameData } from "@/stores/game";
import { ApiError } from "@/lib/api/errors";
import { validateGuestUsername } from "../lib/guestUsername";

/**
 * Manages start page state, player order, and room lifecycle actions.
 */
export function useStartPage() {
  const gameFlow = useGameFlowPort();
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const navigate = useNavigate();
  const { id: gameIdParam } = useParams<{ id?: string }>();

  const gameSettings = useStore($gameSettings);
  const lastFinishedGameId = useStore($lastFinishedGameId);
  const invitation = useStore($invitation);
  const currentGameId = useStore($currentGameId);

  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isGuestOverlayOpen, setIsGuestOverlayOpen] = useState(false);
  const [guestUsername, setGuestUsername] = useState("");
  const [guestError, setGuestError] = useState<string | null>(null);
  const [guestSuggestions, setGuestSuggestions] = useState<string[]>([]);
  const [isAddingGuest, setIsAddingGuest] = useState(false);

  // gameId aus URL-Parameter oder Store
  const gameId = useMemo(() => {
    if (gameIdParam) {
      const parsed = Number(gameIdParam);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return invitation?.gameId ?? null;
  }, [gameIdParam, invitation?.gameId]);

  // Wenn keine gameId in der URL ist, lösche currentGameId aus dem Store
  useEffect(() => {
    if (!gameIdParam && !invitation?.gameId && currentGameId) {
      setCurrentGameId(null);
    }
  }, [gameIdParam, invitation?.gameId, currentGameId]);

  const { players, count: playerCount } = useGamePlayers(gameId);
  const [playerOrder, setPlayerOrder] = useState<number[]>([]);

  useEffect(() => {
    if (players.length > 0) {
      const sortedByPosition = [...players].sort(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
      );
      setPlayerOrder(sortedByPosition.map((p) => p.id));
    } else {
      setPlayerOrder([]);
    }
  }, [players]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setPlayerOrder((items) => {
          const oldIndex = items.indexOf(active.id as number);
          const newIndex = items.indexOf(over.id as number);
          const nextOrder = arrayMove(items, oldIndex, newIndex);

          if (gameId) {
            const positionsPayload = nextOrder.map((playerId, position) => ({
              playerId,
              position,
            }));
            gameFlow.updatePlayerOrder(gameId, positionsPayload).catch((err) => {
              console.warn("Failed to persist player order", err);
            });
          }

          return nextOrder;
        });
      }
    },
    [gameFlow, gameId],
  );

  // Verwende gameSettings vom Backend, falls vorhanden, sonst Defaults
  const startScore = gameSettings?.startScore ?? 301;
  const isDoubleOut = gameSettings?.doubleOut ?? false;
  const isTripleOut = gameSettings?.tripleOut ?? false;

  const handleRemovePlayer = async (playerId: number, currentGameId: number): Promise<void> => {
    try {
      await gameFlow.leaveRoom(currentGameId, playerId);
    } catch {
      void 0;
    }
  };

  useEffect(() => {
    if (!gameId || invitation?.gameId === gameId || isRestoring) return;

    const restoreData = async () => {
      setIsRestoring(true);
      try {
        if (currentGameId && currentGameId !== gameId) {
          console.warn(`Redirecting from game ${gameId} to active game ${currentGameId}`);
          navigate(`/start/${currentGameId}`, { replace: true });
          return;
        }

        if (currentGameId === null) {
          console.warn(`No active game, redirecting from game ${gameId} to /start`);
          setInvitation(null);
          navigate("/start", { replace: true });
          return;
        }

        const gameData = await gameFlow.getGameThrows(gameId);

        if (gameData.status !== "lobby") {
          console.warn(`Access to game ${gameId} denied - status: ${gameData.status}`);
          if (currentGameId) {
            navigate(`/start/${currentGameId}`, { replace: true });
          } else {
            navigate("/start", { replace: true });
          }
          return;
        }

        setGameData(gameData);

        try {
          const inviteResponse = await gameFlow.getInvitation(gameId);
          setInvitation({
            gameId: inviteResponse.gameId,
            invitationLink: inviteResponse.invitationLink,
          });
          setCurrentGameId(inviteResponse.gameId);
        } catch (error) {
          console.warn("Could not load invitation link:", error);
          setCurrentGameId(gameId);
        }
      } catch (error) {
        console.error("Failed to restore game data:", error);
        // Bei Fehler zurück zum aktuellen Game aus dem Store
        if (currentGameId) {
          navigate(`/start/${currentGameId}`, { replace: true });
        } else {
          navigate("/start", { replace: true });
        }
      } finally {
        setIsRestoring(false);
      }
    };

    restoreData();
  }, [gameFlow, gameId, invitation?.gameId, isRestoring, navigate, currentGameId]);

  useEffect(() => {
    if (invitation?.gameId) {
      setCurrentGameId(invitation.gameId);
    }
  }, [invitation?.gameId]);

  const handleStartGame = async (): Promise<void> => {
    if (!gameId || starting) return;

    setStarting(true);

    try {
      const audio = new Audio(START_SOUND_PATH);
      audio.volume = 0.4;
      audio.play().catch(() => {});

      await gameFlow.startGame(gameId, {
        startScore: startScore,
        doubleOut: isDoubleOut,
        tripleOut: isTripleOut,
        round: 1,
        status: "started",
      });

      navigate(`/game/${gameId}`);
    } catch {
      void 0;
    } finally {
      setStarting(false);
    }
  };

  const handleCreateRoom = async (): Promise<void> => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await gameFlow.createRoom({
        previousGameId: lastFinishedGameId ?? undefined,
      });
      setInvitation(response);
      setCurrentGameId(response.gameId);
      // Navigiere zu /start/{gameId} für URL-Persistenz
      navigate(`/start/${response.gameId}`);
    } catch {
      void 0;
    } finally {
      setCreating(false);
    }
  };

  const openGuestOverlay = (): void => {
    setGuestError(null);
    setGuestSuggestions([]);
    setIsGuestOverlayOpen(true);
  };

  const closeGuestOverlay = (): void => {
    setIsGuestOverlayOpen(false);
    setGuestUsername("");
    setGuestError(null);
    setGuestSuggestions([]);
  };

  const handleGuestUsernameChange = useCallback(
    (value: string): void => {
      setGuestUsername(value);
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
    setGuestUsername(suggestion);
    setGuestError(null);
    setGuestSuggestions([]);
  }, []);

  const getGuestErrorFromApi = (error: unknown): AddGuestErrorResponse | null => {
    if (!(error instanceof ApiError) || error.status !== 409) {
      return null;
    }

    const data = error.data;
    if (typeof data !== "object" || data === null) {
      return null;
    }

    const typed = data as AddGuestErrorResponse;
    if (typed.error !== "USERNAME_TAKEN") {
      return null;
    }

    return typed;
  };

  const handleAddGuest = async (): Promise<void> => {
    if (!gameId || isAddingGuest) {
      setGuestError("Please create a game first.");
      return;
    }

    const trimmedUsername = guestUsername.trim();
    const validationError = validateGuestUsername(trimmedUsername);
    if (validationError) {
      setGuestError(validationError);
      return;
    }

    setIsAddingGuest(true);
    setGuestError(null);
    setGuestSuggestions([]);

    try {
      await gameFlow.addGuestPlayer(gameId, { username: trimmedUsername });
      closeGuestOverlay();
    } catch (error) {
      const apiError = getGuestErrorFromApi(error);
      if (apiError) {
        setGuestError(apiError.message || "Username already taken.");
        setGuestSuggestions(apiError.suggestions ?? []);
        return;
      }
      setGuestError("Could not add guest. Please try again.");
    } finally {
      setIsAddingGuest(false);
    }
  };

  return {
    invitation,
    gameId,
    lastFinishedGameId,
    playerCount,
    playerOrder,
    creating,
    starting,
    isRestoring,
    isGuestOverlayOpen,
    guestUsername,
    guestError,
    guestSuggestions,
    isAddingGuest,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
    openGuestOverlay,
    closeGuestOverlay,
    setGuestUsername: handleGuestUsernameChange,
    handleGuestSuggestion,
    handleAddGuest,
  };
}
