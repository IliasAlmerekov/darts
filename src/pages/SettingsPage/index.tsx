import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  $gameData,
  $gameSettings,
  $preCreateGameSettings,
  setGameSettings,
  setPreCreateGameSettings,
  setCurrentGameId,
} from "@/shared/store";
import { saveGameSettings } from "@/shared/api/game";
import { gameQueries } from "@/shared/query/game.queries";
import useIsomorphicLayoutEffect from "@/lib/useIsomorphicLayoutEffect";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ErrorState } from "@/shared/ui/error-state";
import type {
  CreateGameSettingsPayload,
  GameMode,
  GameSettingsResponse,
  UpdateGameSettingsPayload,
} from "@/types";
import styles from "./Settings.module.css";
import { SettingsTabs } from "./components/SettingsTabs";

const GAME_MODE_OPTIONS = [
  { label: "Single-out", id: "single-out" },
  { label: "Double-out", id: "double-out" },
  { label: "Triple-out", id: "triple-out" },
] as const satisfies ReadonlyArray<{ label: string; id: GameMode }>;

const DEFAULT_START_SCORE = 301 as const;

const POINTS_OPTIONS = [
  { label: "101", id: 101 },
  { label: "201", id: 201 },
  { label: "301", id: 301 },
  { label: "401", id: 401 },
  { label: "501", id: 501 },
] as const;

function resolveGameMode(doubleOut: boolean, tripleOut: boolean): GameMode {
  if (doubleOut) return "double-out";
  if (tripleOut) return "triple-out";
  return "single-out";
}

function isGameMode(id: string | number): id is GameMode {
  return GAME_MODE_OPTIONS.some((option) => option.id === id);
}

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

interface PendingSave {
  scope: SaveScope;
}

interface RouteGameSaveRequest {
  gameId: number;
  scope: SaveScope;
  payload: UpdateGameSettingsPayload;
  rollback: () => void;
  logContext: Record<string, unknown>;
}

function parseRouteGameId(gameIdParam: string | undefined): number | null {
  if (!gameIdParam) {
    return null;
  }

  const parsed = Number(gameIdParam);
  return Number.isFinite(parsed) ? parsed : null;
}

function SettingsPage(): React.JSX.Element {
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const gameData = useStore($gameData);
  const gameSettings = useStore($gameSettings);
  const preCreateGameSettings = useStore($preCreateGameSettings);

  const routeGameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);
  const [pendingSaves, setPendingSaves] = useState<ReadonlyMap<number, PendingSave>>(
    () => new Map(),
  );
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>("single-out");
  const [selectedPoints, setSelectedPoints] = useState<number>(DEFAULT_START_SCORE);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const selectedGameModeRef = useRef(selectedGameMode);
  const selectedPointsRef = useRef(selectedPoints);
  const effectiveGameIdRef = useRef<number | null>(null);
  // The game the selection refs hold, so a click never mixes in a previous game's values.
  const selectionGameIdRef = useRef<number | null>(null);
  // One pending save per game: it locks only that game's buttons.
  const pendingSavesRef = useRef(new Map<number, PendingSave>());
  const hasRouteGameInStore =
    routeGameId !== null && gameData?.id === routeGameId && gameSettings !== null;
  // Read the route game's settings unless the game store already holds them.
  const { data: routeGameSettings } = useQuery({
    ...gameQueries.settings(routeGameId ?? 0),
    enabled: routeGameId !== null && !hasRouteGameInStore,
  });
  const activeGameSettings = hasRouteGameInStore ? gameSettings : (routeGameSettings ?? null);
  const preCreateGameMode = useMemo(
    () => resolveGameMode(preCreateGameSettings.doubleOut, preCreateGameSettings.tripleOut),
    [preCreateGameSettings.doubleOut, preCreateGameSettings.tripleOut],
  );

  useEffect(() => {
    if (routeGameId !== null) {
      setCurrentGameId(routeGameId);
    }
  }, [routeGameId]);

  useEffect(() => {
    setHasHydratedSelection(false);
    setSaveErrorMessage(null);
    if (routeGameId === null) {
      selectionGameIdRef.current = null;
      setSelectedGameMode(preCreateGameMode);
      setSelectedPoints(preCreateGameSettings.startScore);
      setHasHydratedSelection(true);
    }
  }, [preCreateGameMode, preCreateGameSettings.startScore, routeGameId]);

  // Only hydrate the UI from canonical settings for the route game.
  const currentGameMode = useMemo(
    () =>
      activeGameSettings
        ? resolveGameMode(activeGameSettings.doubleOut, activeGameSettings.tripleOut)
        : "single-out",
    [activeGameSettings],
  );

  const currentPoints = activeGameSettings?.startScore ?? DEFAULT_START_SCORE;
  const effectiveGameId = routeGameId;
  const isHydratingRouteSettings =
    routeGameId !== null && !hasHydratedSelection && activeGameSettings === null;
  const selectedGameModeId =
    hasHydratedSelection || routeGameId === null
      ? selectedGameMode
      : activeGameSettings
        ? currentGameMode
        : null;
  const selectedPointsId =
    hasHydratedSelection || routeGameId === null
      ? selectedPoints
      : activeGameSettings
        ? currentPoints
        : null;

  useEffect(() => {
    selectedGameModeRef.current = selectedGameMode;
  }, [selectedGameMode]);

  useEffect(() => {
    selectedPointsRef.current = selectedPoints;
  }, [selectedPoints]);

  // A save settling after a route commit must already see the new game, so this is not a passive effect.
  useIsomorphicLayoutEffect(() => {
    effectiveGameIdRef.current = effectiveGameId;
  }, [effectiveGameId]);

  useEffect(() => {
    if (routeGameId === null) {
      return;
    }

    const shouldSyncFromCanonicalResponse = routeGameSettings !== undefined;
    if (hasHydratedSelection && !shouldSyncFromCanonicalResponse) {
      return;
    }
    if (!activeGameSettings) {
      return;
    }

    setSelectedGameMode(currentGameMode);
    setSelectedPoints(currentPoints);
    // The tabs already show these values, so a click before the next render must read them.
    selectedGameModeRef.current = currentGameMode;
    selectedPointsRef.current = currentPoints;
    selectionGameIdRef.current = routeGameId;
    setHasHydratedSelection(true);
  }, [
    activeGameSettings,
    currentGameMode,
    currentPoints,
    hasHydratedSelection,
    routeGameId,
    routeGameSettings,
  ]);

  const updatePreCreateSettings = useCallback((settings: CreateGameSettingsPayload): void => {
    setPreCreateGameSettings(settings);
  }, []);

  const storeSavedSettings = useCallback(
    (settings: GameSettingsResponse, gameId: number): void => {
      const { queryKey } = gameQueries.settings(gameId);
      // A read still in flight started before the save, so its response would be older.
      void queryClient.cancelQueries({ queryKey });
      queryClient.setQueryData(queryKey, settings);
      setGameSettings(settings, gameId);
    },
    [queryClient],
  );

  // Between the route commit and the hydration effects the selection still holds the previous game.
  const isSettingsChangeBlocked = useCallback((): boolean => {
    const gameId = effectiveGameIdRef.current;
    if (selectionGameIdRef.current !== gameId) return true;
    return gameId !== null && pendingSavesRef.current.has(gameId);
  }, []);

  const saveRouteGameSettings = useCallback(
    async ({
      gameId,
      scope,
      payload,
      rollback,
      logContext,
    }: RouteGameSaveRequest): Promise<void> => {
      const pendingSavesByGame = pendingSavesRef.current;
      const syncPendingSaves = (): void => setPendingSaves(new Map(pendingSavesByGame));
      pendingSavesByGame.set(gameId, { scope });
      syncPendingSaves();
      setSaveErrorMessage(null);

      try {
        const response = await saveGameSettings(payload, gameId);
        storeSavedSettings(response, gameId);
      } catch (error) {
        // The route can move to another game while the save is pending.
        if (effectiveGameIdRef.current === gameId) {
          rollback();
          setSaveErrorMessage(toUserErrorMessage(error, SAVE_FAILURE[scope].message));
        }
        clientLogger.error(SAVE_FAILURE[scope].logEvent, {
          context: { gameId, ...logContext },
          error,
        });
      } finally {
        pendingSavesByGame.delete(gameId);
        syncPendingSaves();
      }
    },
    [storeSavedSettings],
  );

  const handleGameModeClick = useCallback(
    async (id: string | number) => {
      if (isSettingsChangeBlocked()) return;
      if (!isGameMode(id)) return;

      const mode = id;
      const isDoubleOut = mode === "double-out";
      const isTripleOut = mode === "triple-out";
      const previousMode = selectedGameModeRef.current;
      setSelectedGameMode(mode);
      selectedGameModeRef.current = mode;

      if (!effectiveGameIdRef.current) {
        updatePreCreateSettings({
          startScore: selectedPointsRef.current,
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        });
        return;
      }

      await saveRouteGameSettings({
        gameId: effectiveGameIdRef.current,
        scope: "game-mode",
        payload: {
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        },
        rollback: () => {
          setSelectedGameMode(previousMode);
          selectedGameModeRef.current = previousMode;
        },
        logContext: { requestedMode: mode },
      });
    },
    [isSettingsChangeBlocked, saveRouteGameSettings, updatePreCreateSettings],
  );

  const handlePointsClick = useCallback(
    async (id: string | number) => {
      if (isSettingsChangeBlocked()) return;

      const points = Number(id);
      const currentMode = selectedGameModeRef.current;
      const isDoubleOut = currentMode === "double-out";
      const isTripleOut = currentMode === "triple-out";
      const previousPoints = selectedPointsRef.current;
      setSelectedPoints(points);
      selectedPointsRef.current = points;

      if (!effectiveGameIdRef.current) {
        updatePreCreateSettings({
          startScore: points,
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        });
        return;
      }

      await saveRouteGameSettings({
        gameId: effectiveGameIdRef.current,
        scope: "points",
        payload: {
          startScore: points,
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        },
        rollback: () => {
          setSelectedPoints(previousPoints);
          selectedPointsRef.current = previousPoints;
        },
        logContext: { requestedPoints: points },
      });
    },
    [isSettingsChangeBlocked, saveRouteGameSettings, updatePreCreateSettings],
  );

  const isSavingRouteGame = (scope: SaveScope): boolean =>
    routeGameId !== null && pendingSaves.get(routeGameId)?.scope === scope;

  return (
    <div className={styles.settings}>
      <h1>Settings</h1>
      <section className={styles.settingsSection}>
        {saveErrorMessage ? (
          <ErrorState
            {...(styles.settingsError ? { className: styles.settingsError } : {})}
            title="Could not update settings"
            message={saveErrorMessage}
          />
        ) : null}
        <div className={styles.settingsBody}>
          <SettingsTabs
            title="Game Mode"
            options={GAME_MODE_OPTIONS}
            selectedId={selectedGameModeId}
            onChange={handleGameModeClick}
            disabled={isHydratingRouteSettings || isSavingRouteGame("game-mode")}
          />
          <SettingsTabs
            title="Points"
            options={POINTS_OPTIONS}
            selectedId={selectedPointsId}
            onChange={handlePointsClick}
            disabled={isHydratingRouteSettings || isSavingRouteGame("points")}
            mobileLayout="grid"
          />
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
