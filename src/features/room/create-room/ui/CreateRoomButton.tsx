import { useCreateRoom } from "../model/useCreateRoom";

interface CreateRoomButtonProps {
  previousGameId?: number;
  onCreated?: (room: { gameId: number; invitationLink: string }) => void;
  disabled?: boolean;
  label?: string;
}

export function CreateRoomButton({
  previousGameId,
  onCreated,
  disabled,
  label = "Create room",
}: CreateRoomButtonProps) {
  const { createRoom, loading, error } = useCreateRoom();

  const handleClick = async () => {
    const room = await createRoom(previousGameId);
    onCreated?.(room);
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
