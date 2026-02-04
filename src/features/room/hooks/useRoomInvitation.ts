import { useEffect, useState } from "react";
import type { CreateRoomResponse } from "@/types/api";
import { createRoom as createRoomRequest, type CreateGamePayload } from "../api";

export type Invitation = CreateRoomResponse;

/**
 * Creates a game room and exposes the invitation data.
 */
export function useRoomInvitation() {
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    setInvitation(null);
  }, []);

  const createRoom = async (options?: CreateGamePayload): Promise<void> => {
    try {
      const data = await createRoomRequest(options);
      setInvitation(data);
    } catch {
      // ignore
    }
  };

  return { invitation, createRoom };
}
