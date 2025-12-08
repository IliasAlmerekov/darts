import { useRematch } from "../model/useRematch";

interface RematchButtonProps {
  gameId: number;
  onRematch?: (data: { gameId: number; invitationLink: string }) => void;
  disabled?: boolean;
  label?: string;
}

export function RematchButton({
  gameId,
  onRematch,
  disabled,
  label = "Rematch",
}: RematchButtonProps) {
  const { rematch, loading, error } = useRematch();

  const handleClick = async () => {
    const data = await rematch(gameId);
    onRematch?.(data);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={disabled || loading}>
        {loading ? "Creating..." : label}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}
