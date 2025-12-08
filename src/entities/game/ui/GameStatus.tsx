import type { GameStatus } from "@/shared/types/game";

interface GameStatusBadgeProps {
  status: GameStatus;
}

const STATUS_LABELS: Record<GameStatus, string> = {
  lobby: "Lobby",
  started: "Running",
  finished: "Finished",
};

export function GameStatusBadge({ status }: GameStatusBadgeProps) {
  return <span className={`game-status game-status--${status}`}>{STATUS_LABELS[status]}</span>;
}
