import { useMemo } from "react";
import { useParams } from "react-router-dom";

/**
 * Extracts and validates the game id route param.
 */
export function useGamePage() {
  const { id } = useParams<{ id?: string }>();

  const gameId = useMemo(() => {
    if (!id) return null;
    const parsed = Number(id);
    return Number.isFinite(parsed) ? parsed : null;
  }, [id]);

  return { gameId };
}
