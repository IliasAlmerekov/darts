import styles from "./GameBoard.module.css";
import { GameStatusBadge } from "@/entities/game";
import { useGameBoard } from "../model/useGameBoard";
import type { GameState } from "@/shared/types";

interface GameBoardProps {
  gameId: number;
}

function PlayersList({ game }: { game: GameState }) {
  return (
    <div className={styles.playersCard}>
      <div className={styles.gameBoardHeader}>
        <h3>Players</h3>
        <span className={styles.gameStatus}>
          Round {game.currentRound} • Current #{game.currentPlayerId}
        </span>
      </div>
      <div className={styles.playersList}>
        {game.players.map((player) => {
          const isActive = player.id === game.currentPlayerId;
          return (
            <div
              key={player.id}
              className={`${styles.playerRow} ${isActive ? styles.playerRowActive : ""}`}
            >
              <span className={styles.playerName}>{player.username}</span>
              <span className={styles.playerScore}>{player.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function KeyboardPlaceholder() {
  return (
    <div className={styles.keyboardPlaceholder}>
      Score keyboard goes here (hook up `ScoreKeyboard` feature).
    </div>
  );
}

export function GameBoard({ gameId }: GameBoardProps) {
  const { game, isLoading, error } = useGameBoard(gameId);

  if (isLoading) return <div>Loading game...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!game) return null;

  return (
    <div className={styles.gameBoard}>
      <div className={styles.gameBoardHeader}>
        <h2>Game #{game.gameId}</h2>
        <GameStatusBadge status={game.status} />
      </div>

      <PlayersList game={game} />

      <div className={styles.controlsCard}>
        <KeyboardPlaceholder />
      </div>
    </div>
  );
}
