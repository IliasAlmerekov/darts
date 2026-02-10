import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/lib/api";

type RoomStreamEvent = {
  type: string;
  data: unknown;
};

const SSE_STREAM_ENDPOINT = (id: number) => `/room/${id}/stream`;

export function useRoomStream(gameId: number | null) {
  const [event, setEvent] = useState<RoomStreamEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const eventSource = new EventSource(`${API_BASE_URL}${SSE_STREAM_ENDPOINT(gameId)}`, {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    const setEventFrom = (type: string) => (e: MessageEvent<string>) => {
      setEvent({ type, data: JSON.parse(e.data) });
    };

    eventSource.addEventListener("player-joined", setEventFrom("player-joined"));
    eventSource.addEventListener("player-left", setEventFrom("player-left"));
    eventSource.addEventListener("game-started", setEventFrom("game-started"));
    eventSource.addEventListener("throw-recorded", setEventFrom("throw-recorded"));
    eventSource.addEventListener("game-finished", setEventFrom("game-finished"));

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [gameId]);

  return { event, isConnected };
}
