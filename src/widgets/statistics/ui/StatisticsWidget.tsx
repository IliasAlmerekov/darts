import styles from "./StatisticsWidget.module.css";
import { useStatistics } from "../model/useStatistics";

export function StatisticsWidget() {
  const { overview, playerStats, loading, error } = useStatistics();

  if (loading) return <div>Loading statistics...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className={styles.widget}>
      <div className={styles.card}>
        <h3 className={styles.title}>Games Overview</h3>
        <div className={styles.list}>
          {overview?.items.map((game) => (
            <div key={game.id} className={styles.row}>
              <span className={styles.label}>{game.winnerName}</span>
              <span className={styles.value}>
                {game.playersCount} players • {game.winnerRounds} rounds
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <h3 className={styles.title}>Top Players</h3>
        <div className={styles.list}>
          {playerStats?.items.map((player) => (
            <div key={player.playerId} className={styles.row}>
              <span className={styles.label}>{player.username}</span>
              <span className={styles.value}>Ø {player.roundAverage?.toFixed?.(1) ?? "-"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
