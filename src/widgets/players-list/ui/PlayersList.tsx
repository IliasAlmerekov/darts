import styles from "./PlayersList.module.css";
import { PlayersListItem } from "./PlayersListItem";
import type { GamePlayer } from "@/shared/types/game";

interface PlayersListProps {
  players: GamePlayer[];
  currentPlayerId?: number | null;
}

export function PlayersList({ players, currentPlayerId }: PlayersListProps) {
  return (
    <div className={styles.list}>
      {players.map((player) => (
        <PlayersListItem key={player.id} player={player} isActive={player.id === currentPlayerId} />
      ))}
    </div>
  );
}
