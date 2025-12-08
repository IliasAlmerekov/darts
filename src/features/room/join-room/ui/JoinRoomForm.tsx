import { useState } from "react";
import { useJoinRoom } from "../model/useJoinRoom";

interface JoinRoomFormProps {
  onJoined?: (data: { gameId: number; invitationLink: string }) => void;
  disabled?: boolean;
}

export function JoinRoomForm({ onJoined, disabled }: JoinRoomFormProps) {
  const { joinRoom, loading, error } = useJoinRoom();
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await joinRoom(code);
    onJoined?.(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Invite code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        disabled={disabled || loading}
      />
      <button type="submit" disabled={disabled || loading || !code}>
        {loading ? "Joining..." : "Join room"}
      </button>
      {error && <div>{error}</div>}
    </form>
  );
}
