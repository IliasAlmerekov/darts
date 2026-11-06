import React from "react";
import clsx from "clsx";
import SelectedPlayerItem from "./SelectedPlayerItem";
import styles from "./LivePlayersList.module.css";

interface LivePlayer {
  id: number;
  name: string;
  position: number | null;
}

interface LivePlayersListProps {
  onRemovePlayer?: (playerId: number) => void;
  dragEnd?: boolean;
  maxPlayers?: number;
  players: LivePlayer[];
  playerCount: number;
}

function LivePlayersListComponent({
  onRemovePlayer,
  dragEnd,
  maxPlayers = 10,
  players,
  playerCount,
}: LivePlayersListProps): React.JSX.Element {
  const isFull = playerCount >= maxPlayers;

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
        {players.length === 0 ? (
          <div className={styles.noPlayersMessage}>
            <p>No players yet. Scan the QR code to join!</p>
          </div>
        ) : (
          players.map((player) => (
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
    previousProps.players === nextProps.players
  );
});
