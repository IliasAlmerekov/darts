import { useRemovePlayer } from "../model/useRemovePlayer";

interface RemovePlayerButtonProps {
  gameId: number;
  playerId: number;
  onRemoved?: () => void;
  disabled?: boolean;
  label?: string;
}

export function RemovePlayerButton({
  gameId,
  playerId,
  onRemoved,
  disabled,
  label = "Remove player",
}: RemovePlayerButtonProps) {
  const { leaveRoom, loading, error } = useRemovePlayer();

  const handleClick = async () => {
    await leaveRoom(gameId, playerId);
    onRemoved?.();
  };

  return (
    <div>
      <button onClick={handleClick} disabled={disabled || loading}>
        {loading ? "Removing..." : label}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}
