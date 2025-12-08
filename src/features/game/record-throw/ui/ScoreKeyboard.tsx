import { useRecordThrow } from "../model/useRecordThrow";
import type { ThrowRequest } from "@/shared/types";

interface ScoreKeyboardProps {
  gameId: number;
  currentPlayerId: number;
  onUpdate?: (game: unknown) => void;
  disabled?: boolean;
}

const KEYS = [180, 140, 100, 60, 45, 26, 20, 19, 18, 17, 16, 15, 12, 10, 9, 8, 7, 6, 5, 3, 1, 0];

export function ScoreKeyboard({ gameId, currentPlayerId, onUpdate, disabled }: ScoreKeyboardProps) {
  const { recordThrow, loading, error } = useRecordThrow(gameId);

  const handleClick = async (value: number) => {
    const payload: ThrowRequest = { playerId: currentPlayerId, value };
    const game = await recordThrow(payload);
    onUpdate?.(game);
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8 }}>
        {KEYS.map((key) => (
          <button key={key} onClick={() => handleClick(key)} disabled={disabled || loading}>
            {key}
          </button>
        ))}
      </div>
      {error && <div>{error}</div>}
    </div>
  );
}
