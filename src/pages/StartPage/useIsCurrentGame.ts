import { useCallback, useRef } from "react";
import useIsomorphicLayoutEffect from "@/lib/useIsomorphicLayoutEffect";

/**
 * Returns a stable check for whether a game id is still the one the page shows. A seat request
 * that settles after the route moved to another game uses it to drop its UI updates.
 */
export function useIsCurrentGame(gameId: number | null): (requestGameId: number) => boolean {
  const currentGameIdRef = useRef(gameId);

  // A layout effect, so the ref is current before a response can land after a route commit.
  useIsomorphicLayoutEffect(() => {
    currentGameIdRef.current = gameId;
  }, [gameId]);

  return useCallback((requestGameId) => currentGameIdRef.current === requestGameId, []);
}
