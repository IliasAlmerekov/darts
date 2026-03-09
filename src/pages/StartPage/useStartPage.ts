import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useGamePlayers } from "./useGamePlayers";
import { $gameSettings, setGameData } from "@/store";
import {
  $lastFinishedGameId,
  $invitation,
  $currentGameId,
  setCurrentGameId,
  setInvitation,
} from "@/store";
import { getGameThrows, startGame } from "@/shared/api/game";
import {
  createRoom,
  getInvitation,
  updatePlayerOrder,
  leaveRoom,
  addGuestPlayer,
} from "@/shared/api/room";
import { ApiError } from "@/shared/api";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { validateGuestUsername } from "./lib/guestUsername";
import type { AddGuestErrorResponse } from "@/types";
import { ROUTES } from "@/lib/routes";

/**
 * Parses the raw URL route param into a valid game ID.
 * Returns null for anything that is not a positive integer string.
 * Invitation and session-storage values are intentionally NOT consulted —
 * the route param is the single authoritative source for the active game.
 */
export function resolveGameId(gameIdParam: string | undefined): number | null {
  if (!gameIdParam) return null;
  const parsed = Number(gameIdParam);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

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

type GamePlayersResult = ReturnType<typeof useGamePlayers>;
type StartPageLatestState = {
  players: GamePlayersResult["players"];
  appendOptimisticPlayer: GamePlayersResult["appendOptimisticPlayer"];
  removeOptimisticPlayer: GamePlayersResult["removeOptimisticPlayer"];
  guestUsername: string;
  isAddingGuest: boolean;
  isLobbyFull: boolean;
  gameId: number | null;
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

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
const MAX_LOBBY_PLAYERS = 10;

/**
 * Manages start page state, player order, and room lifecycle actions.
 */
export function useStartPage() {
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

  const gameId = useMemo(() => resolveGameId(gameIdParam), [gameIdParam]);

  useEffect(() => {
    if (shouldRedirectToCurrentGame(gameIdParam, invitation?.gameId, currentGameId)) {
      navigate(ROUTES.start(currentGameId ?? undefined), { replace: true });
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
  const latestStateRef = useRef<StartPageLatestState>({
    players,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
    guestUsername,
    isAddingGuest,
    isLobbyFull,
    gameId,
  });

  latestStateRef.current = {
    players,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
    guestUsername,
    isAddingGuest,
    isLobbyFull,
    gameId,
  };

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
          const oldIndex = items.indexOf(Number(active.id));
          const newIndex = items.indexOf(Number(over.id));
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
              updatePlayerOrder,
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
    [gameId],
  );

  const startScore = gameSettings?.startScore ?? 301;
  const isDoubleOut = gameSettings?.doubleOut ?? false;
  const isTripleOut = gameSettings?.tripleOut ?? false;

  const handleRemovePlayer = useCallback(
    async (playerId: number, currentGameId: number): Promise<void> => {
      const { players, removeOptimisticPlayer, appendOptimisticPlayer } = latestStateRef.current;
      const removedPlayer = players.find((player) => player.id === playerId);
      removeOptimisticPlayer(playerId);

      try {
        await leaveRoom(currentGameId, playerId);
      } catch (error) {
        if (removedPlayer) {
          appendOptimisticPlayer(removedPlayer);
        }
        setPageError(toUserErrorMessage(error, "Could not remove player. Please try again."));
      }
    },
    [],
  );

  useEffect(() => {
    if (!gameId || invitation?.gameId === gameId) return;
    const controller = new AbortController();
    const { signal } = controller;

    const restoreData = async () => {
      setIsRestoring(true);
      try {
        if (signal.aborted) {
          return;
        }

        if (currentGameId && currentGameId !== gameId) {
          console.warn(`Redirecting from game ${gameId} to active game ${currentGameId}`);
          navigate(ROUTES.start(currentGameId), { replace: true });
          return;
        }

        if (currentGameId === null) {
          console.warn(`No active game, redirecting from game ${gameId} to /start`);
          setInvitation(null);
          navigate(ROUTES.start(), { replace: true });
          return;
        }

        const gameData = await getGameThrows(gameId, signal);
        if (signal.aborted) {
          return;
        }

        if (gameData.status !== "lobby") {
          console.warn(`Access to game ${gameId} denied - status: ${gameData.status}`);
          if (currentGameId) {
            navigate(ROUTES.start(currentGameId), { replace: true });
          } else {
            navigate(ROUTES.start(), { replace: true });
          }
          return;
        }

        setGameData(gameData);

        try {
          const inviteResponse = await getInvitation(gameId, signal);
          if (signal.aborted) {
            return;
          }
          setInvitation({
            gameId: inviteResponse.gameId,
            invitationLink: inviteResponse.invitationLink,
          });
          setCurrentGameId(inviteResponse.gameId);
        } catch (error) {
          if (isAbortError(error) || signal.aborted) {
            return;
          }
          console.warn("Could not load invitation link:", error);
          setCurrentGameId(gameId);
        }
      } catch (error) {
        if (isAbortError(error) || signal.aborted) {
          return;
        }
        console.error("Failed to restore game data:", error);
        if (currentGameId) {
          navigate(ROUTES.start(currentGameId), { replace: true });
        } else {
          navigate(ROUTES.start(), { replace: true });
        }
      } finally {
        if (!signal.aborted) {
          setIsRestoring(false);
        }
      }
    };

    void restoreData();

    return () => {
      controller.abort();
    };
  }, [gameId, invitation?.gameId, navigate, currentGameId]);

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

      await startGame(gameId, {
        startScore: startScore,
        doubleOut: isDoubleOut,
        tripleOut: isTripleOut,
        round: 1,
        status: "started",
      });

      navigate(ROUTES.game(gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not start game. Please try again."));
    } finally {
      startGameInFlightRef.current = false;
      setStarting(false);
    }
  }, [gameId, isDoubleOut, isTripleOut, navigate, startScore, starting]);

  const handleCreateRoom = useCallback(async (): Promise<void> => {
    if (creating || createRoomInFlightRef.current || invitation?.gameId) return;
    createRoomInFlightRef.current = true;
    setCreating(true);
    setPageError(null);
    try {
      const response = await createRoom({
        previousGameId: lastFinishedGameId ?? undefined,
      });
      setInvitation(response);
      setCurrentGameId(response.gameId);
      navigate(ROUTES.start(response.gameId));
    } catch (error) {
      setPageError(toUserErrorMessage(error, "Could not create a new game. Please try again."));
    } finally {
      createRoomInFlightRef.current = false;
      setCreating(false);
    }
  }, [creating, invitation?.gameId, lastFinishedGameId, navigate]);

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
    const {
      gameId: currentGameId,
      guestUsername,
      isAddingGuest,
      isLobbyFull,
      appendOptimisticPlayer,
    } = latestStateRef.current;

    if (!currentGameId || isAddingGuest) {
      setGuestError("Please create a game first.");
      return;
    }

    if (isLobbyFull) {
      setGuestError("The lobby is full. Remove a player to add another.");
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
      const guestPlayer = await addGuestPlayer(currentGameId, { username: trimmedUsername });
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
      setIsAddingGuest(false);
    }
  }, [closeGuestOverlay, getGuestErrorFromApi]);

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
