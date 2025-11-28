import { useCallback, useEffect, useState } from "react";
import { handleCreateGame, CreateGamePayload } from "../services/api";

export type Invitation = {
  gameId: number;
  invitationLink: string;
};

export const ROOM_INVITATION_STORAGE_KEY = "roomInvitation";

export const readInvitationFromStorage = (): Invitation | null => {
  try {
    const storedInvitation = sessionStorage.getItem(ROOM_INVITATION_STORAGE_KEY);
    return storedInvitation ? JSON.parse(storedInvitation) : null;
  } catch (error) {
    console.error("Failed to restore invitation from storage:", error);
    sessionStorage.removeItem(ROOM_INVITATION_STORAGE_KEY);
    return null;
  }
};

export const persistInvitationToStorage = (data: Invitation | null) => {
  if (!data) {
    sessionStorage.removeItem(ROOM_INVITATION_STORAGE_KEY);
    return;
  }

  sessionStorage.setItem(ROOM_INVITATION_STORAGE_KEY, JSON.stringify(data));
};

export function useRoomInvitation() {
  const [invitation, setInvitation] = useState<Invitation | null>(() =>
    readInvitationFromStorage(),
  );

  useEffect(() => {
    const existing = readInvitationFromStorage();
    if (existing) {
      setInvitation(existing);
    }
  }, []);

  const persistInvitation = useCallback((data: Invitation | null) => {
    setInvitation(data);
    persistInvitationToStorage(data);
  }, []);

  const createRoom = useCallback(
    async (options?: CreateGamePayload) => {
      try {
        const data = await handleCreateGame(options);
        persistInvitation(data);
      } catch (error) {
        console.error("Error during room creation:", error);
      }
    },
    [persistInvitation],
  );

  return { invitation, createRoom };
}
