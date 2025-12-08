import type { GameState } from "../model/types";
import { GameStatusBadge } from "./GameStatus";

interface GameCardProps {
  game: GameState;
}

export function GameCard({ game }: GameCardProps) {
  return (
    <div className="game-card">
      <div className="game-card__header">
        <h3>Game #{game.gameId}</h3>
        <GameStatusBadge status={game.status} />
      </div>
      <div className="game-card__meta">
        <span>Round {game.currentRound}</span>
        <span>Players: {game.players.length}</span>
      </div>
    </div>
  );
}
