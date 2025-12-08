import { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useRoomInvitation } from "../../../hooks/useRoomInvitation";
import { useGamePlayers } from "../../../hooks/useGamePlayers";
import { startGame, deletePlayerFromGame } from "../../../services/api";
import { $settings, $lastFinishedGameId, setCurrentGameId } from "../../../stores";

export function useStartPage() {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";

  const settings = useStore($settings);
  const lastFinishedGameId = useStore($lastFinishedGameId);

  const { invitation, createRoom } = useRoomInvitation();

  const gameId = invitation?.gameId ?? null;
  const { players, count: playerCount } = useGamePlayers(gameId, lastFinishedGameId);
  const [playerOrder, setPlayerOrder] = useState<number[]>([]);

  // Sync player order with fetched players
  useEffect(() => {
    if (players.length > 0) {
      setPlayerOrder(players.map((p) => p.id));
    }
  }, [players]);

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPlayerOrder((items) => {
        const oldIndex = items.indexOf(active.id as number);
        const newIndex = items.indexOf(over.id as number);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const isDoubleOut = settings.gameMode === "double-out";
  const isTripleOut = settings.gameMode === "triple-out";

  const handleRemovePlayer = async (playerId: number, currentGameId: number): Promise<void> => {
    try {
      await deletePlayerFromGame(currentGameId, playerId);
    } catch {
      // Ignore errors when removing player
      void 0;
    }
  };

  useEffect(() => {
    if (invitation?.gameId) {
      setCurrentGameId(invitation.gameId);
    }
  }, [invitation?.gameId]);

  const handleStartGame = async (): Promise<void> => {
    if (!gameId) return;

    const audio = new Audio(START_SOUND_PATH);
    audio.volume = 0.4;
    audio.play().catch(() => {});

    await startGame(gameId, {
      startScore: settings.points,
      doubleOut: isDoubleOut,
      tripleOut: isTripleOut,
      round: 1,
      status: "started",
    });
  };

  const handleCreateRoom = (): void => {
    createRoom({
      previousGameId: lastFinishedGameId ?? undefined,
    });
  };

  return {
    invitation,
    gameId,
    lastFinishedGameId,
    playerCount,
    playerOrder,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
  };
}
