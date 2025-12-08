import { useState } from "react";
import { roomApi } from "@/entities/room";

export function useLeaveRoom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leaveRoom = async (gameId: number, playerId: number) => {
    setLoading(true);
    setError(null);
    try {
      await roomApi.leaveRoom(gameId, playerId);
    } catch (err) {
      setError("Konnte Raum nicht verlassen");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { leaveRoom, loading, error };
}
