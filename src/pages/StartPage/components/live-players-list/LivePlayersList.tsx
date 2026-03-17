import React, { useMemo } from "react";
import clsx from "clsx";
import SelectedPlayerItem from "../player-items/SelectedPlayerItem";
import styles from "./LivePlayersList.module.css";

interface LivePlayer {
  id: number;
  name: string;
  position: number | null;
}

interface LivePlayersListProps {
  onRemovePlayer?: (playerId: number) => void;
  dragEnd?: boolean;
  playerOrder?: number[];
  maxPlayers?: number;
  players: LivePlayer[];
  playerCount: number;
}

function LivePlayersListComponent({
  onRemovePlayer,
  dragEnd,
  playerOrder,
  maxPlayers = 10,
  players,
  playerCount,
}: LivePlayersListProps): React.JSX.Element {
  const isFull = playerCount >= maxPlayers;

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
        <div
          className={clsx(styles.listCount, isFull ? styles.listCountFull : styles.listCountOpen)}
          aria-live="polite"
        >
          {isFull ? `${playerCount}/${maxPlayers} Full` : `${playerCount}/${maxPlayers}`}
        </div>
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
                if (onRemovePlayer) {
                  onRemovePlayer(player.id);
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
}

export const LivePlayersList = React.memo(LivePlayersListComponent, (previousProps, nextProps) => {
  return (
    previousProps.dragEnd === nextProps.dragEnd &&
    previousProps.maxPlayers === nextProps.maxPlayers &&
    previousProps.onRemovePlayer === nextProps.onRemovePlayer &&
    previousProps.playerCount === nextProps.playerCount &&
    previousProps.players === nextProps.players &&
    previousProps.playerOrder === nextProps.playerOrder
  );
});
