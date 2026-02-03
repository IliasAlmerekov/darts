import { useUndoThrow } from "../hooks/useUndoThrow";

interface UndoButtonProps {
  gameId: number;
  onUpdate?: (game: unknown) => void;
  disabled?: boolean;
  label?: string;
}

export function UndoButton({ gameId, onUpdate, disabled, label = "Undo" }: UndoButtonProps) {
  const { undoThrow, loading, error } = useUndoThrow();

  const handleClick = async () => {
    const game = await undoThrow(gameId);
    onUpdate?.(game);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={disabled || loading}>
        {loading ? "Undoing..." : label}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}
