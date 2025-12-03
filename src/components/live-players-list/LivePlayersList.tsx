import { useGamePlayers } from "../../hooks/useGamePlayers";
import SelectedPlayerItem from "../player-items/SelectedPlayerItem";
import styles from "./LivePlayersList.module.css";

interface LivePlayersListProps {
  gameId: number | null;
  onRemovePlayer?: (playerId: number, gameId: number) => void;
  dragEnd?: boolean;
}

export const LivePlayersList = ({ gameId, onRemovePlayer, dragEnd }: LivePlayersListProps) => {
  const { players, count } = useGamePlayers(gameId);

  return (
    <div className={styles.livePlayersContainer}>
      <h4 className={styles.headerSelectedPlayers}>
        Selected Players <div className={styles.listCount}>{count}/10</div>
      </h4>
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
