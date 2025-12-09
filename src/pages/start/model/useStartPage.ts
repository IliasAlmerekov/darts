import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useGamePlayers } from "../../../hooks/useGamePlayers";
import { roomApi } from "@/entities/room";
import { gameApi } from "@/entities/game";
import {
  $lastFinishedGameId,
  $invitation,
  $gameSettings,
  setCurrentGameId,
  setInvitation,
} from "@/stores";

export function useStartPage() {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const navigate = useNavigate();

  const gameSettings = useStore($gameSettings);
  const lastFinishedGameId = useStore($lastFinishedGameId);
  const invitation = useStore($invitation);

  const [creating, setCreating] = useState(false);
  const [starting, setStarting] = useState(false);
  const gameId = useMemo(() => invitation?.gameId ?? null, [invitation?.gameId]);

  const { players, count: playerCount } = useGamePlayers(gameId, lastFinishedGameId);
  const [playerOrder, setPlayerOrder] = useState<number[]>([]);

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

  // Verwende gameSettings vom Backend, falls vorhanden, sonst Defaults
  const startScore = gameSettings?.startScore ?? 301;
  const isDoubleOut = gameSettings?.doubleOut ?? false;
  const isTripleOut = gameSettings?.tripleOut ?? false;

  const handleRemovePlayer = async (playerId: number, currentGameId: number): Promise<void> => {
    try {
      await roomApi.leaveRoom(currentGameId, playerId);
    } catch {
      void 0;
    }
  };

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

      await gameApi.startGame(gameId, {
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
      const response = await roomApi.createRoom({
        previousGameId: lastFinishedGameId ?? undefined,
      });
      setInvitation(response);
      setCurrentGameId(response.gameId);
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
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
  };
}
