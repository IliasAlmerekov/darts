import React, { useMemo } from "react";
import { useGamePlayers } from "@/hooks/useGamePlayers";
import SelectedPlayerItem from "../player-items/SelectedPlayerItem";
import styles from "./LivePlayersList.module.css";

type LivePlayer = {
  id: number;
  name: string;
  position: number | null;
};

interface LivePlayersListProps {
  gameId: number | null;
  onRemovePlayer?: (playerId: number, gameId: number) => void;
  dragEnd?: boolean;
  playerOrder?: number[];
  maxPlayers?: number;
  players?: LivePlayer[];
  playerCount?: number;
}

function LivePlayersListComponent({
  gameId,
  onRemovePlayer,
  dragEnd,
  playerOrder,
  maxPlayers = 10,
  players: playersFromProps,
  playerCount: playerCountFromProps,
}: LivePlayersListProps): React.JSX.Element {
  const { players: playersFromHook, count: countFromHook } = useGamePlayers(gameId);
  const players = playersFromProps ?? playersFromHook;
  const count = playerCountFromProps ?? countFromHook;
  const isFull = count >= maxPlayers;

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
          className={`${styles.listCount} ${isFull ? styles.listCountFull : styles.listCountOpen}`}
          aria-live="polite"
        >
          {isFull ? `${count}/${maxPlayers} Full` : `${count}/${maxPlayers}`}
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
}

export const LivePlayersList = React.memo(LivePlayersListComponent, (previousProps, nextProps) => {
  return (
    previousProps.gameId === nextProps.gameId &&
    previousProps.dragEnd === nextProps.dragEnd &&
    previousProps.maxPlayers === nextProps.maxPlayers &&
    previousProps.playerCount === nextProps.playerCount &&
    previousProps.players === nextProps.players &&
    previousProps.playerOrder === nextProps.playerOrder
  );
});
