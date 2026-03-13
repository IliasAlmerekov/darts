import { useMemo, useState } from "react";
import { API_BASE_URL } from "@/shared/api";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import type { RoomStreamEvent } from "@/types";
import { useEventSource, type EventSourceListener } from "./useEventSource";

const SSE_STREAM_ENDPOINT = (id: number) => `/room/${id}/stream`;
const ROOM_STREAM_EVENT_TYPES = [
  "player-joined",
  "player-left",
  "game-started",
  "throw",
  "throw-recorded",
  "game-finished",
] as const;

interface UseRoomStreamResult {
  event: RoomStreamEvent | null;
  error: Error | null;
  isConnected: boolean;
}

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
export function useRoomStream(gameId: number | null): UseRoomStreamResult {
  const [event, setEvent] = useState<RoomStreamEvent | null>(null);

  const listeners = useMemo<readonly EventSourceListener[]>(() => {
    // `listeners` must stay referentially stable for `useEventSource`.
    // They do not capture `gameId`; reconnects are driven by the URL memo below.
    return ROOM_STREAM_EVENT_TYPES.map((type) => ({
      event: type,
      handler: (streamEvent: MessageEvent<string>) => {
        const parsedData = parseRoomStreamEventData(streamEvent.data);
        if (parsedData === null) {
          clientLogger.warn("room-stream.invalid-payload", {
            context: { type },
          });
          return;
        }

        setEvent({ type, data: parsedData });
      },
    }));
  }, []);

  const url = useMemo(() => {
    return gameId ? `${API_BASE_URL}${SSE_STREAM_ENDPOINT(gameId)}` : null;
  }, [gameId]);

  const { error, isConnected } = useEventSource(url, listeners, {
    withCredentials: true,
  });

  return { event, isConnected, error };
}
