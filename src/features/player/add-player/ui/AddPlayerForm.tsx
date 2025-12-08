import { useAddPlayer } from "../model/useAddPlayer";

interface AddPlayerFormProps {
  onAdded?: (data: { gameId: number; invitationLink: string }) => void;
  disabled?: boolean;
}

import { useState } from "react";
import { useAddPlayer } from "../model/useAddPlayer";

export function AddPlayerForm({ onAdded, disabled }: AddPlayerFormProps) {
  const { joinRoom, loading, error } = useAddPlayer();
  const [code, setCode] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await joinRoom(code);
    onAdded?.(data);
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
        {loading ? "Adding..." : "Add player"}
      </button>
      {error && <div>{error}</div>}
    </form>
  );
}
