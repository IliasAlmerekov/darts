import { useCallback, useState } from "react";
import { ApiError } from "@/shared/api";
import { getGameThrows, resetGameStateVersion } from "@/shared/api/game";
import { isRecord } from "@/lib/guards/guards";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { setGameData } from "@/shared/store";

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

  const typedPayload = isRecord(payload) ? payload : null;
  return typedPayload?.error === "GAME_THROW_NOT_ALLOWED";
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
        clientLogger.error("game.reconciliation.refresh.failed", {
          context: { gameId },
          error: refreshError,
        });
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
