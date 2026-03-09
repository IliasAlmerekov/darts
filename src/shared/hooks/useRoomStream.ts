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

    const EVENT_TYPES = [
      "player-joined",
      "player-left",
      "game-started",
      "throw",
      "throw-recorded",
      "game-finished",
    ] as const;

    let cleanupSource: (() => void) | null = null;

    function connect(): void {
      const eventSource = new EventSource(url, { withCredentials: true });

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

      const handlers = EVENT_TYPES.map((type) => ({
        type,
        handler: setEventFrom(type),
      }));

      for (const { type, handler } of handlers) {
        eventSource.addEventListener(type, handler);
      }

      function dispose(): void {
        for (const { type, handler } of handlers) {
          eventSource.removeEventListener(type, handler);
        }
        eventSource.onopen = null;
        eventSource.onerror = null;
        eventSource.close();
      }

      cleanupSource = dispose;

      eventSource.onerror = () => {
        setIsConnected(false);
        dispose();
        retryTimerId = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY_MS);
          connect();
        }, retryDelay);
      };
    }

    connect();

    return () => {
      if (retryTimerId !== null) clearTimeout(retryTimerId);
      cleanupSource?.();
    };
  }, [gameId]);

  return { event, isConnected };
}
