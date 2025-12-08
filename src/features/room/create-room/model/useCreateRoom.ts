import { useState } from "react";
import { roomApi } from "@/entities/room";
import type { CreateRoomResponse } from "@/shared/types/api";

export function useCreateRoom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createRoom = async (previousGameId?: number): Promise<CreateRoomResponse> => {
    setLoading(true);
    setError(null);

    try {
      return await roomApi.createRoom({ previousGameId });
    } catch (err) {
      setError("Raum konnte nicht erstellt werden");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createRoom, loading, error };
}
