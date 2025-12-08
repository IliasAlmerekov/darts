import type { StartGameRequest } from "@/shared/types";
import { useStartGame } from "../model/useStartGame";

interface StartGameButtonProps {
  gameId: number;
  config: StartGameRequest;
  onStarted?: (game: unknown) => void;
  disabled?: boolean;
  label?: string;
}

export function StartGameButton({
  gameId,
  config,
  onStarted,
  disabled,
  label = "Start game",
}: StartGameButtonProps) {
  const { startGame, loading, error } = useStartGame();

  const handleClick = async () => {
    const game = await startGame(gameId, config);
    onStarted?.(game);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={disabled || loading}>
        {loading ? "Starting..." : label}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}
