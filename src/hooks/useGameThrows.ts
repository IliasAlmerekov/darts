import { useCallback, useMemo, useState } from "react";
import { useEventSource } from "./useEventSource";

export type ServerThrowPayload = {
  id?: number;
  player?: number;
  playerId?: number;
  playerName?: string;
  value?: number;
  score?: number;
  throwNumber?: number;
  timestamp?: string;
  isDouble?: boolean;
  isTriple?: boolean;
  [key: string]: unknown;
};

export const useGameThrows = (gameId: number | null) => {
  const [latestThrow, setLatestThrow] = useState<ServerThrowPayload | null>(null);

  const url = useMemo(() => (gameId ? `/api/room/${gameId}/stream` : null), [gameId]);

  const handleThrowEvent = useCallback((event: MessageEvent<string>) => {
    try {
      const payload = JSON.parse(event.data) as ServerThrowPayload;
      setLatestThrow(payload);
    } catch (error) {
      console.error("[useGameThrows] Failed to parse throw event data:", error);
    }
  }, []);

  useEventSource(url, "throw", handleThrowEvent, { withCredentials: true });

  return { latestThrow };
};
