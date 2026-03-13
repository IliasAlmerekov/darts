import { useMemo, useState } from "react";
import { API_BASE_URL } from "@/shared/api";
import { clientLogger } from "@/lib/clientLogger";
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

interface ParsedRoomStreamEventDataResult {
  data: unknown;
  error: Error | null;
}

function parseRoomStreamEventPayload(rawData: string): ParsedRoomStreamEventDataResult {
  try {
    return { data: JSON.parse(rawData), error: null };
  } catch (error: unknown) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

export function parseRoomStreamEventData(rawData: string): unknown {
  return parseRoomStreamEventPayload(rawData).data;
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
      handler: (streamEvent: MessageEvent<string>): void => {
        const { data: parsedData, error: parseError } = parseRoomStreamEventPayload(
          streamEvent.data,
        );

        if (parsedData === null || parseError !== null) {
          clientLogger.warn("room_stream_invalid_payload", {
            raw: streamEvent.data,
            error: parseError,
          });
          return;
        }

        setEvent({ type, data: parsedData });
      },
    }));
  }, []);

  const url = useMemo(() => {
    return gameId !== null ? `${API_BASE_URL}${SSE_STREAM_ENDPOINT(gameId)}` : null;
  }, [gameId]);

  const { error, isConnected } = useEventSource(url, listeners, {
    withCredentials: true,
  });

  return { event, isConnected, error };
}
