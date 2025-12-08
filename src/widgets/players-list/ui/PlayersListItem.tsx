import styles from "./PlayersList.module.css";
import type { GamePlayer } from "@/shared/types/game";

interface PlayersListItemProps {
  player: GamePlayer;
  isActive?: boolean;
}

export function PlayersListItem({ player, isActive = false }: PlayersListItemProps) {
  return (
    <div className={`${styles.item} ${isActive ? styles.itemActive : ""}`}>
      <span className={styles.name}>{player.username}</span>
      <span className={styles.score}>{player.score}</span>
    </div>
  );
}
