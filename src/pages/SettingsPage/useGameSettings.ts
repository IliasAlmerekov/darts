import { useCallback, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  $gameData,
  $preCreateGameSettings,
  setGameSettings,
  setPreCreateGameSettings,
} from "@/shared/store";
import { saveGameSettings } from "@/shared/api/game";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";
import { gameQueries } from "@/shared/query/game.queries";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import type { GameMode, GameSettings, UpdateGameSettingsPayload } from "@/types";
import { isGameMode, isStartScore, resolveGameMode, toGameModeFlags } from "./lib/gameMode";

type SaveScope = "game-mode" | "points";

const SAVE_FAILURE = {
  "game-mode": {
    message: "Could not update the game mode. Please try again.",
    logEvent: "settings.save-game-mode.failed",
  },
  points: {
    message: "Could not update the points. Please try again.",
    logEvent: "settings.save-points.failed",
  },
} as const satisfies Record<SaveScope, { message: string; logEvent: string }>;

interface RouteGameSaveRequest {
  gameId: number;
  scope: SaveScope;
  buildPayload: (current: GameSettings) => UpdateGameSettingsPayload;
  logContext: Record<string, unknown>;
}

export interface UseGameSettingsReturn {
  /** Null while the route game's settings are not loaded. */
  selectedGameMode: GameMode | null;
  selectedPoints: number | null;
  /** The route game's settings are missing, or one of its saves is pending. */
  isDisabled: boolean;
  loadErrorMessage: string | null;
  retryLoad: () => void;
  saveErrorMessage: string | null;
  selectGameMode: (id: string | number) => void;
  selectPoints: (id: string | number) => void;
}

/**
 * Settings of the route game, read from and saved to its query cache entry. Without a game
 * id in the route, the pre-create draft in `$preCreateGameSettings`.
 */
export function useGameSettings(): UseGameSettingsReturn {
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const routeGameId = parseRouteGameId(gameIdParam);
  const queryClient = useQueryClient();
  const gameData = useStore($gameData);
  const preCreateGameSettings = useStore($preCreateGameSettings);
  const [pendingSaveGameIds, setPendingSaveGameIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );
  const [saveError, setSaveError] = useState<{ gameId: number; message: string } | null>(null);
  // The lock itself: one pending save per game locks that game only. The state above renders it.
  const pendingSaveGameIdsRef = useRef(new Set<number>());

  // The query starts from the game store copy, so a game in the store needs no read.
  const isRouteGameInStore = routeGameId !== null && gameData?.id === routeGameId;
  const {
    data: routeGameSettings,
    error: loadError,
    refetch,
  } = useQuery({
    ...gameQueries.settings(routeGameId ?? 0),
    enabled: routeGameId !== null && !isRouteGameInStore,
  });

  // A save error belongs to its game, so a route move to another game drops it.
  if (saveError !== null && saveError.gameId !== routeGameId) {
    setSaveError(null);
  }

  const saveRouteGameSettings = useCallback(
    async ({ gameId, scope, buildPayload, logContext }: RouteGameSaveRequest): Promise<void> => {
      const { queryKey } = gameQueries.settings(gameId);
      const previous = queryClient.getQueryData(queryKey);
      const pendingGameIds = pendingSaveGameIdsRef.current;
      if (previous === undefined || pendingGameIds.has(gameId)) return;

      const syncPendingSaves = (): void => setPendingSaveGameIds(new Set(pendingGameIds));
      pendingGameIds.add(gameId);
      syncPendingSaves();
      setSaveError(null);
      const payload = buildPayload(previous);
      // A read still in flight started before the change, so its response would be older.
      void queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, { ...previous, ...payload });

      try {
        const response = await saveGameSettings(payload, gameId);
        void queryClient.cancelQueries({ queryKey });
        queryClient.setQueryData(queryKey, response);
        setGameSettings(response, gameId);
      } catch (error) {
        queryClient.setQueryData(queryKey, previous);
        setSaveError({ gameId, message: toUserErrorMessage(error, SAVE_FAILURE[scope].message) });
        clientLogger.error(SAVE_FAILURE[scope].logEvent, {
          context: { gameId, ...logContext },
          error,
        });
      } finally {
        pendingGameIds.delete(gameId);
        syncPendingSaves();
      }
    },
    [queryClient, setPendingSaveGameIds, setSaveError],
  );

  const selectGameMode = useCallback(
    (id: string | number): void => {
      if (!isGameMode(id)) return;

      if (routeGameId === null) {
        setPreCreateGameSettings({ ...$preCreateGameSettings.get(), ...toGameModeFlags(id) });
        return;
      }

      void saveRouteGameSettings({
        gameId: routeGameId,
        scope: "game-mode",
        buildPayload: () => toGameModeFlags(id),
        logContext: { requestedMode: id },
      });
    },
    [routeGameId, saveRouteGameSettings],
  );

  const selectPoints = useCallback(
    (id: string | number): void => {
      if (!isStartScore(id)) return;

      if (routeGameId === null) {
        setPreCreateGameSettings({ ...$preCreateGameSettings.get(), startScore: id });
        return;
      }

      void saveRouteGameSettings({
        gameId: routeGameId,
        scope: "points",
        buildPayload: ({ doubleOut, tripleOut }) => ({ startScore: id, doubleOut, tripleOut }),
        logContext: { requestedPoints: id },
      });
    },
    [routeGameId, saveRouteGameSettings],
  );

  const settings = routeGameId === null ? preCreateGameSettings : (routeGameSettings ?? null);

  return {
    selectedGameMode: settings ? resolveGameMode(settings.doubleOut, settings.tripleOut) : null,
    selectedPoints: settings ? settings.startScore : null,
    isDisabled: routeGameId !== null && (settings === null || pendingSaveGameIds.has(routeGameId)),
    loadErrorMessage:
      settings === null && loadError !== null
        ? toUserErrorMessage(loadError, "Please try again.")
        : null,
    retryLoad: () => void refetch(),
    saveErrorMessage: saveError?.message ?? null,
    selectGameMode,
    selectPoints,
  };
}
