import { useState } from "react";
import { apiClient, API_ENDPOINTS } from "@/shared/api";

interface JoinResponse {
  gameId: number;
  invitationLink: string;
}

export function useJoinRoom() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinRoom = async (inviteId: string): Promise<JoinResponse> => {
    setLoading(true);
    setError(null);
    try {
      return await apiClient.get<JoinResponse>(API_ENDPOINTS.JOIN_INVITE(inviteId));
    } catch (err) {
      setError("Join fehlgeschlagen");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { joinRoom, loading, error };
}
