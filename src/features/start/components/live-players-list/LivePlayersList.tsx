import { useGamePlayers } from "@/hooks/useGamePlayers";
import SelectedPlayerItem from "../player-items/SelectedPlayerItem";
import styles from "./LivePlayersList.module.css";
import { useMemo } from "react";

interface LivePlayersListProps {
  gameId: number | null;
  onRemovePlayer?: (playerId: number, gameId: number) => void;
  dragEnd?: boolean;
  playerOrder?: number[];
}

export const LivePlayersList = ({
  gameId,
  onRemovePlayer,
  dragEnd,
  playerOrder,
}: LivePlayersListProps) => {
  const { players, count } = useGamePlayers(gameId);

  const sortedPlayers = useMemo(() => {
    if (!playerOrder || playerOrder.length === 0) {
      return [...players].sort(
        (a, b) => (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return [...players].sort((a, b) => {
      const indexA = playerOrder.indexOf(a.id);
      const indexB = playerOrder.indexOf(b.id);

      if (indexA === -1) return 1;
      if (indexB === -1) return -1;

      return indexA - indexB;
    });
  }, [players, playerOrder]);

  return (
    <div className={styles.livePlayersContainer}>
      <div className={styles.headerSelectedPlayers}>
        <h4 className={styles.headerTitle}>Selected Players</h4>
        <div className={styles.listCount}>{count}/10</div>
      </div>
      <div className={styles.selectedPlayerListScroll}>
        {sortedPlayers.length === 0 ? (
          <div className={styles.noPlayersMessage}>
            <p>No players yet. Scan the QR code to join!</p>
          </div>
        ) : (
          sortedPlayers.map((player) => (
            <SelectedPlayerItem
              key={player.id}
              name={player.name}
              user={player}
              handleClick={() => {
                if (onRemovePlayer && gameId) {
                  onRemovePlayer(player.id, gameId);
                }
              }}
              alt="Remove player"
              dragEnd={dragEnd}
            />
          ))
        )}
      </div>
    </div>
  );
};
