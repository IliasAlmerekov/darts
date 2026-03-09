import { useCallback, useState } from "react";
import { ApiError } from "@/shared/api";
import { getGameThrows, resetGameStateVersion } from "@/shared/api/game";
import { setGameData } from "@/store";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

interface UseThrowReconciliationOptions {
  gameId: number | null;
}

interface UseThrowReconciliationReturn {
  syncMessage: string | null;
  updateSyncMessage: (message: string | null) => void;
  clearSyncMessage: () => void;
  reconcileGameState: (message: string) => Promise<void>;
}

export function isThrowNotAllowedConflict(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return false;
  }

  const payload = error.data;
  if (payload === null || typeof payload !== "object") {
    return false;
  }

  const typedPayload = payload as ApiErrorPayload;
  return typedPayload.error === "GAME_THROW_NOT_ALLOWED";
}

export function useThrowReconciliation({
  gameId,
}: UseThrowReconciliationOptions): UseThrowReconciliationReturn {
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const updateSyncMessage = useCallback((message: string | null): void => {
    setSyncMessage(message);
  }, []);

  const clearSyncMessage = useCallback((): void => {
    setSyncMessage(null);
  }, []);

  const reconcileGameState = useCallback(
    async (message: string): Promise<void> => {
      if (!gameId) {
        setSyncMessage(message);
        return;
      }

      try {
        resetGameStateVersion(gameId);
        const refreshedGameState = await getGameThrows(gameId);
        setGameData(refreshedGameState);
      } catch (refreshError) {
        console.error("Failed to refresh game state during reconciliation:", refreshError);
      } finally {
        setSyncMessage(message);
      }
    },
    [gameId],
  );

  return {
    syncMessage,
    updateSyncMessage,
    clearSyncMessage,
    reconcileGameState,
  };
}
