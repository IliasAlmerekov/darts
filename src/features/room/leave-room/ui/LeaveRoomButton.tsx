import { useLeaveRoom } from "../model/useLeaveRoom";

interface LeaveRoomButtonProps {
  gameId: number;
  playerId: number;
  onLeft?: () => void;
  disabled?: boolean;
  label?: string;
}

export function LeaveRoomButton({
  gameId,
  playerId,
  onLeft,
  disabled,
  label = "Leave room",
}: LeaveRoomButtonProps) {
  const { leaveRoom, loading, error } = useLeaveRoom();

  const handleClick = async () => {
    await leaveRoom(gameId, playerId);
    onLeft?.();
  };

  return (
    <div>
      <button onClick={handleClick} disabled={disabled || loading}>
        {loading ? "Leaving..." : label}
      </button>
      {error && <div>{error}</div>}
    </div>
  );
}
