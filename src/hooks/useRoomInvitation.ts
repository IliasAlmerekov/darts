import { useEffect, useState } from "react";
import { roomApi } from "@/entities/room";
import type { CreateRoomResponse } from "@/shared/types/api";
import type { CreateGamePayload } from "@/services/api";

export type Invitation = CreateRoomResponse;

export function useRoomInvitation() {
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    setInvitation(null);
  }, []);

  const createRoom = async (options?: CreateGamePayload): Promise<void> => {
    try {
      const data = await roomApi.createRoom(options);
      setInvitation(data);
    } catch {
      // ignore
    }
  };

  return { invitation, createRoom };
}
