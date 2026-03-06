import { useEffect, useState } from "react";
import { API_BASE_URL } from "@/shared/api";
import type { RoomStreamEvent } from "@/types";

const SSE_STREAM_ENDPOINT = (id: number) => `/room/${id}/stream`;

const INITIAL_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30_000;

export function parseRoomStreamEventData(rawData: string): unknown | null {
  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

/**
 * Subscribes to room SSE stream and exposes the latest event.
 * Reconnects automatically with exponential backoff on error.
 */
export function useRoomStream(gameId: number | null): {
  event: RoomStreamEvent | null;
  isConnected: boolean;
} {
  const [event, setEvent] = useState<RoomStreamEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    const url = `${API_BASE_URL}${SSE_STREAM_ENDPOINT(gameId)}`;
    let retryDelay = INITIAL_RETRY_DELAY_MS;
    let retryTimerId: ReturnType<typeof setTimeout> | null = null;
    let currentSource: EventSource | null = null;

    function connect(): void {
      const eventSource = new EventSource(url, { withCredentials: true });
      currentSource = eventSource;

      eventSource.onopen = () => {
        setIsConnected(true);
        retryDelay = INITIAL_RETRY_DELAY_MS;
      };

      const setEventFrom = (type: string) => (e: MessageEvent<string>) => {
        const parsedData = parseRoomStreamEventData(e.data);
        if (parsedData === null) {
          console.warn("[useRoomStream] Received invalid SSE payload", { type });
          return;
        }

        setEvent({ type, data: parsedData });
      };

      eventSource.addEventListener("player-joined", setEventFrom("player-joined"));
      eventSource.addEventListener("player-left", setEventFrom("player-left"));
      eventSource.addEventListener("game-started", setEventFrom("game-started"));
      eventSource.addEventListener("throw", setEventFrom("throw"));
      eventSource.addEventListener("throw-recorded", setEventFrom("throw-recorded"));
      eventSource.addEventListener("game-finished", setEventFrom("game-finished"));

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        retryTimerId = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      if (retryTimerId !== null) clearTimeout(retryTimerId);
      currentSource?.close();
    };
  }, [gameId]);

  return { event, isConnected };
}
