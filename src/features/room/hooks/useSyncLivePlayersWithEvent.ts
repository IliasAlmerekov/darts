import { useGamePlayers } from "./useGamePlayers";
import { useEffect, useRef } from "react";
import type { Player, EventState } from "@/types/event";

interface UseSyncLivePlayersWithEventParams {
  gameId: number | null;
  selectedPlayers: Player[];
  updateEvent: (path: Partial<EventState>) => void;
}

export function UseSyncLivePlayersWithEvent({
  gameId,
  selectedPlayers,
  updateEvent,
}: UseSyncLivePlayersWithEventParams) {
  const previousLivePlayersRef = useRef<Set<number>>(new Set());
  const selectedPlayersRef = useRef<Player[]>(selectedPlayers);

  // Keep selectedPlayersRef updated
  useEffect(() => {
    selectedPlayersRef.current = selectedPlayers;
  }, [selectedPlayers]);

  const { players: livePlayers } = useGamePlayers(gameId);

  useEffect(() => {
    if (!livePlayers.length) return;

    const currentLivePlayersIds = new Set(livePlayers.map((p) => p.id));
    const previousLivePlayerIds = previousLivePlayersRef.current;

    const selectedIds = new Set(selectedPlayersRef.current.map((player) => player.id));

    const newPlayers = livePlayers.filter(
      (livePlayer) => !previousLivePlayerIds.has(livePlayer.id) && !selectedIds.has(livePlayer.id),
    );

    if (newPlayers.length > 0) {
      const playersToAdd: Player[] = newPlayers.map((player) => ({
        id: player.id,
        name: player.name,
        isAdded: true,
      }));

      updateEvent({
        selectedPlayers: [...selectedPlayersRef.current, ...playersToAdd],
      });
    }

    previousLivePlayersRef.current = currentLivePlayersIds;
  }, [livePlayers, updateEvent]);
}
