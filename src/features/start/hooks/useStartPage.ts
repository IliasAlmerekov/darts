import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useGamePlayers } from "@/features/room";
import { createRoom, getInvitation, leaveRoom, updatePlayerOrder } from "@/features/room/api";
import { getGameThrows, startGame } from "@/features/game/api";
import {
  $lastFinishedGameId,
  $invitation,
  $gameSettings,
  $currentGameId,
  setCurrentGameId,
  setInvitation,
} from "@/stores";
import { setGameData } from "@/stores/game";

/**
 * Manages start page state, player order, and room lifecycle actions.
 */
export function useStartPage() {
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

  const { players, count: playerCount } = useGamePlayers(gameId, lastFinishedGameId);
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
            updatePlayerOrder(gameId, positionsPayload).catch((err) => {
              console.warn("Failed to persist player order", err);
            });
          }

          return nextOrder;
        });
      }
    },
    [gameId],
  );

  // Verwende gameSettings vom Backend, falls vorhanden, sonst Defaults
  const startScore = gameSettings?.startScore ?? 301;
  const isDoubleOut = gameSettings?.doubleOut ?? false;
  const isTripleOut = gameSettings?.tripleOut ?? false;

  const handleRemovePlayer = async (playerId: number, currentGameId: number): Promise<void> => {
    try {
      await leaveRoom(currentGameId, playerId);
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

        const gameData = await getGameThrows(gameId);

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
          const inviteResponse = await getInvitation(gameId);
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
  }, [gameId, invitation?.gameId, isRestoring, navigate, currentGameId]);

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

      await startGame(gameId, {
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
      const response = await createRoom({
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

  return {
    invitation,
    gameId,
    lastFinishedGameId,
    playerCount,
    playerOrder,
    creating,
    starting,
    isRestoring,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
  };
}
