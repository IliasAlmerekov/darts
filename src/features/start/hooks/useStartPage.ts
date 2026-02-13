import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { validateGuestUsername } from "../lib/guestUsername";

export function shouldRedirectToCurrentGame(
  gameIdParam?: string,
  invitationGameId?: number | null,
  currentGameId?: number | null,
): boolean {
  return !gameIdParam && !invitationGameId && typeof currentGameId === "number";
}

type UpdatePlayerOrderFn = (
  gameId: number,
  positions: Array<{ playerId: number; position: number }>,
) => Promise<void>;

type PersistPlayerOrderParams = {
  gameId: number;
  nextOrder: number[];
  previousOrder: number[];
  updatePlayerOrder: UpdatePlayerOrderFn;
  onError: (error: unknown) => void;
  onRollback: (order: number[]) => void;
  shouldRollback: () => boolean;
};

export async function persistPlayerOrder({
  gameId,
  nextOrder,
  previousOrder,
  updatePlayerOrder,
  onError,
  onRollback,
  shouldRollback,
}: PersistPlayerOrderParams): Promise<void> {
  const positionsPayload = nextOrder.map((playerId, position) => ({
    playerId,
    position,
  }));

  try {
    await updatePlayerOrder(gameId, positionsPayload);
  } catch (error) {
    onError(error);
    if (shouldRollback()) {
      onRollback(previousOrder);
    }
  }
}

/**
 * Manages start page state, player order, and room lifecycle actions.
 */
export function useStartPage() {
  const gameFlow = useGameFlowPort();
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const MAX_LOBBY_PLAYERS = 10;
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
  const [pageError, setPageError] = useState<string | null>(null);
  const guestUsernameRef = useRef(guestUsername);
  const isAddingGuestRef = useRef(isAddingGuest);
  const isLobbyFullRef = useRef(false);
  const gameIdRef = useRef<number | null>(null);

  // gameId aus URL-Parameter oder Store
  const gameId = useMemo(() => {
    if (gameIdParam) {
      const parsed = Number(gameIdParam);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return invitation?.gameId ?? null;
  }, [gameIdParam, invitation?.gameId]);

  // Restore active lobby route when we only have the persisted current game id.
  useEffect(() => {
    if (shouldRedirectToCurrentGame(gameIdParam, invitation?.gameId, currentGameId)) {
      navigate(`/start/${currentGameId}`, { replace: true });
    }
  }, [gameIdParam, invitation?.gameId, currentGameId, navigate]);

  const {
    players,
    count: playerCount,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
  } = useGamePlayers(gameId);
  const isLobbyFull = playerCount >= MAX_LOBBY_PLAYERS;
  const [playerOrder, setPlayerOrder] = useState<number[]>([]);
  const playerOrderRequestIdRef = useRef(0);
  const createRoomInFlightRef = useRef(false);
  const startGameInFlightRef = useRef(false);
  const playersRef = useRef(players);
  const appendOptimisticPlayerRef = useRef(appendOptimisticPlayer);
  const removeOptimisticPlayerRef = useRef(removeOptimisticPlayer);

  useEffect(() => {
    playersRef.current = players;
  }, [players]);

  useEffect(() => {
    appendOptimisticPlayerRef.current = appendOptimisticPlayer;
  }, [appendOptimisticPlayer]);

  useEffect(() => {
    removeOptimisticPlayerRef.current = removeOptimisticPlayer;
  }, [removeOptimisticPlayer]);

  useEffect(() => {
    guestUsernameRef.current = guestUsername;
  }, [guestUsername]);

  useEffect(() => {
    isAddingGuestRef.current = isAddingGuest;
  }, [isAddingGuest]);

  useEffect(() => {
    isLobbyFullRef.current = isLobbyFull;
  }, [isLobbyFull]);

  useEffect(() => {
    gameIdRef.current = gameId;
  }, [gameId]);

  useEffect(() => {
    if (players.length <= 0) {
      setPlayerOrder([]);
      return;
    }

    const idsByPosition = [...players]
      .sort(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
      )
      .map((player) => player.id);

    setPlayerOrder((previousOrder) => {
      if (previousOrder.length <= 0) {
        return idsByPosition;
      }

      const knownIds = new Set(idsByPosition);
      const preservedOrder = previousOrder.filter((playerId) => knownIds.has(playerId));
      const newIds = idsByPosition.filter((playerId) => !preservedOrder.includes(playerId));

      const nextOrder = [...preservedOrder, ...newIds];
      if (
        nextOrder.length === previousOrder.length &&
        nextOrder.every((playerId, index) => playerId === previousOrder[index])
      ) {
        return previousOrder;
      }

      return nextOrder;
    });
  }, [players]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        setPlayerOrder((items) => {
          const oldIndex = items.indexOf(active.id as number);
          const newIndex = items.indexOf(over.id as number);
          if (oldIndex === -1 || newIndex === -1) {
            return items;
          }
          const nextOrder = arrayMove(items, oldIndex, newIndex);

          if (gameId) {
            const requestId = ++playerOrderRequestIdRef.current;

            void persistPlayerOrder({
              gameId,
              nextOrder,
              previousOrder: items,
              updatePlayerOrder: gameFlow.updatePlayerOrder,
              onError: (err) => {
                console.warn("Failed to persist player order", err);
                setPageError(
                  toUserErrorMessage(err, "Could not update player order. Please try again."),
                );
              },
              onRollback: (order) => {
                setPlayerOrder(order);
              },
              shouldRollback: () => playerOrderRequestIdRef.current === requestId,
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

  const handleRemovePlayer = useCallback(
    async (playerId: number, currentGameId: number): Promise<void> => {
      const removedPlayer = playersRef.current.find((player) => player.id === playerId);
      removeOptimisticPlayerRef.current?.(playerId);

      try {
        await gameFlow.leaveRoom(currentGameId, playerId);
      } catch (error) {
        if (removedPlayer) {
          appendOptimisticPlayerRef.current?.(removedPlayer);
        }
        setPageError(toUserErrorMessage(error, "Could not remove player. Please try again."));
      }
    },
    [gameFlow],
  );

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

  const handleStartGame = useCallback(async (): Promise<void> => {
    if (!gameId || starting || startGameInFlightRef.current) return;

    startGameInFlightRef.current = true;
    setStarting(true);
    setPageError(null);

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
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not start game. Please try again."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [gameFlow, gameId, isDoubleOut, isTripleOut, navigate, startScore, starting]);

  const handleCreateRoom = useCallback(async (): Promise<void> => {
    if (creating || createRoomInFlightRef.current || invitation?.gameId) return;
    createRoomInFlightRef.current = true;
    setCreating(true);
    setPageError(null);
    try {
      const response = await gameFlow.createRoom({
        previousGameId: lastFinishedGameId ?? undefined,
      });
      setInvitation(response);
      setCurrentGameId(response.gameId);
      // Navigiere zu /start/{gameId} für URL-Persistenz
      navigate(`/start/${response.gameId}`);
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not create a new game. Please try again."));
    } finally {
      createRoomInFlightRef.current = false;
      setCreating(false);
    }
  }, [creating, gameFlow, invitation?.gameId, lastFinishedGameId, navigate]);

  const clearPageError = useCallback((): void => {
    setPageError(null);
  }, []);

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
    setGuestUsername("");
    setGuestError(null);
    setGuestSuggestions([]);
  }, []);

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

  const getGuestErrorFromApi = useCallback((error: unknown): AddGuestErrorResponse | null => {
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
  }, []);

  const handleAddGuest = useCallback(async (): Promise<void> => {
    const currentGameId = gameIdRef.current;
    if (!currentGameId || isAddingGuestRef.current) {
      setGuestError("Please create a game first.");
      return;
    }

    if (isLobbyFullRef.current) {
      setGuestError("The lobby is full. Remove a player to add another.");
      return;
    }

    const trimmedUsername = guestUsernameRef.current.trim();
    const validationError = validateGuestUsername(trimmedUsername);
    if (validationError) {
      setGuestError(validationError);
      return;
    }

    setIsAddingGuest(true);
    setGuestError(null);
    setGuestSuggestions([]);

    try {
      const guestPlayer = await gameFlow.addGuestPlayer(currentGameId, {
        username: trimmedUsername,
      });
      appendOptimisticPlayer?.(guestPlayer);
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
      setIsAddingGuest(false);
    }
  }, [appendOptimisticPlayer, closeGuestOverlay, gameFlow, getGuestErrorFromApi]);

  return {
    invitation,
    gameId,
    lastFinishedGameId,
    players,
    playerCount,
    isLobbyFull,
    playerOrder,
    creating,
    starting,
    isRestoring,
    pageError,
    isGuestOverlayOpen,
    guestUsername,
    guestError,
    guestSuggestions,
    isAddingGuest,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
    clearPageError,
    openGuestOverlay,
    closeGuestOverlay,
    setGuestUsername: handleGuestUsernameChange,
    handleGuestSuggestion,
    handleAddGuest,
  };
}
