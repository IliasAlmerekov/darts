import { useCallback, useEffect, useState } from "react";
import { handleCreateGame } from "../services/api";

type Invitation = {
  gameId: number;
  invitationLink: string;
};

export function useRoomInvitation() {
  const STORAGE_KEY = "roomInvitation";
  const [invitation, setInvitation] = useState<Invitation | null>(null);

  useEffect(() => {
    try {
      const storedInvitation = localStorage.getItem(STORAGE_KEY);
      if (storedInvitation) {
        setInvitation(JSON.parse(storedInvitation));
      }
    } catch (error) {
      console.error("Failed to restore invitation from storage:", error);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persistInvitation = useCallback((data: Invitation | null) => {
    setInvitation(data);
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const createRoom = useCallback(async () => {
    try {
      const data = await handleCreateGame();
      persistInvitation(data);
    } catch (error) {
      console.error("Error during room creation:", error);
    }
  }, [persistInvitation]);

  return { invitation, createRoom };
}
