import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import {
  $gameData,
  $gameSettings,
  $preCreateGameSettings,
  getCachedGameSettings,
  setGameSettings,
  setPreCreateGameSettings,
} from "@/shared/store";
import { $currentGameId, setCurrentGameId } from "@/shared/store";
import { getGameSettings, saveGameSettings } from "@/shared/api/game";
import { clientLogger } from "@/shared/lib/clientLogger";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ErrorState } from "@/shared/ui/error-state";
import type { CreateGameSettingsPayload, GameMode, GameSettingsResponse } from "@/types";
import styles from "./Settings.module.css";
import { SettingsTabs } from "./components/SettingsTabs";

const GAME_MODE_OPTIONS = [
  { label: "Single-out", id: "single-out" },
  { label: "Double-out", id: "double-out" },
  { label: "Triple-out", id: "triple-out" },
] as const satisfies ReadonlyArray<{ label: string; id: GameMode }>;

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

function parseRouteGameId(gameIdParam: string | undefined): number | null {
  if (!gameIdParam) {
    return null;
  }

  const parsed = Number(gameIdParam);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function SettingsPage(): JSX.Element {
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const gameData = useStore($gameData);
  const gameSettings = useStore($gameSettings);
  const preCreateGameSettings = useStore($preCreateGameSettings);
  const currentGameIdFromStore = useStore($currentGameId);

  const routeGameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingScope, setSavingScope] = useState<"game-mode" | "points" | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>("single-out");
  const [selectedPoints, setSelectedPoints] = useState<number>(301);
  const [loadedSettings, setLoadedSettings] = useState<GameSettingsResponse | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const selectedGameModeRef = useRef(selectedGameMode);
  const selectedPointsRef = useRef(selectedPoints);
  const effectiveGameIdRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const cachedRouteGameSettings = routeGameId !== null ? getCachedGameSettings(routeGameId) : null;
  const activeGameSettings =
    routeGameId !== null && gameData?.id === routeGameId
      ? gameSettings
      : (loadedSettings ?? cachedRouteGameSettings);
  const preCreateGameMode = useMemo(
    () => resolveGameMode(preCreateGameSettings.doubleOut, preCreateGameSettings.tripleOut),
    [preCreateGameSettings.doubleOut, preCreateGameSettings.tripleOut],
  );

  // Keep the session store aligned only with the canonical route id.
  useEffect(() => {
    if (routeGameId !== null && routeGameId !== currentGameIdFromStore) {
      setCurrentGameId(routeGameId);
    }
  }, [routeGameId, currentGameIdFromStore]);

  useEffect(() => {
    setHasHydratedSelection(false);
    setLoadedSettings(null);
    setSaveErrorMessage(null);
    if (routeGameId === null) {
      setSelectedGameMode(preCreateGameMode);
      setSelectedPoints(preCreateGameSettings.startScore);
      setHasHydratedSelection(true);
    }
  }, [preCreateGameMode, preCreateGameSettings.startScore, routeGameId]);

  // Load settings only for the explicit route game id.
  useEffect(() => {
    if (!routeGameId) {
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    const loadGameSettings = async () => {
      try {
        const settings = await getGameSettings(routeGameId, signal);
        if (signal.aborted) {
          return;
        }
        setLoadedSettings(settings);
      } catch (error) {
        if (isAbortError(error) || signal.aborted) {
          return;
        }
        clientLogger.error("settings.load.failed", {
          context: { routeGameId },
          error,
        });
      }
    };

    const hasCurrentGameInStore = gameData?.id === routeGameId && gameSettings !== null;
    if (!hasCurrentGameInStore) {
      void loadGameSettings();
    }

    return () => {
      controller.abort();
    };
  }, [routeGameId, gameData?.id, gameSettings]);

  // Only hydrate the UI from canonical settings for the route game.
  const currentGameMode = useMemo(
    () =>
      activeGameSettings
        ? resolveGameMode(activeGameSettings.doubleOut, activeGameSettings.tripleOut)
        : "single-out",
    [activeGameSettings],
  );

  const currentPoints = activeGameSettings?.startScore ?? 301;
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

  useEffect(() => {
    effectiveGameIdRef.current = effectiveGameId;
  }, [effectiveGameId]);

  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  useEffect(() => {
    if (routeGameId === null) {
      return;
    }

    const shouldSyncFromCanonicalResponse = loadedSettings !== null;
    if (hasHydratedSelection && !shouldSyncFromCanonicalResponse) {
      return;
    }
    if (!activeGameSettings) {
      return;
    }

    setSelectedGameMode(currentGameMode);
    setSelectedPoints(currentPoints);
    setHasHydratedSelection(true);
  }, [
    activeGameSettings,
    currentGameMode,
    currentPoints,
    hasHydratedSelection,
    loadedSettings,
    routeGameId,
  ]);

  const updatePreCreateSettings = useCallback((settings: CreateGameSettingsPayload): void => {
    setPreCreateGameSettings(settings);
  }, []);

  const handleGameModeClick = useCallback(
    async (id: string | number) => {
      if (isSavingRef.current) return;
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

      setSaveErrorMessage(null);
      setIsSaving(true);
      setSavingScope("game-mode");
      isSavingRef.current = true;

      try {
        const response = await saveGameSettings(
          {
            doubleOut: isDoubleOut,
            tripleOut: isTripleOut,
          },
          effectiveGameIdRef.current,
        );
        setLoadedSettings(response);
        setGameSettings(response, effectiveGameIdRef.current);
        setSaveErrorMessage(null);
      } catch (error) {
        setSelectedGameMode(previousMode);
        selectedGameModeRef.current = previousMode;
        setSaveErrorMessage(
          toUserErrorMessage(error, "Could not update the game mode. Please try again."),
        );
        clientLogger.error("settings.save-game-mode.failed", {
          context: {
            gameId: effectiveGameIdRef.current,
            requestedMode: mode,
          },
          error,
        });
      } finally {
        setIsSaving(false);
        setSavingScope(null);
        isSavingRef.current = false;
      }
    },
    [updatePreCreateSettings],
  );

  const handlePointsClick = useCallback(
    async (id: string | number) => {
      if (isSavingRef.current) return;

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

      setSaveErrorMessage(null);
      setIsSaving(true);
      setSavingScope("points");
      isSavingRef.current = true;

      try {
        const response = await saveGameSettings(
          {
            startScore: points,
            doubleOut: isDoubleOut,
            tripleOut: isTripleOut,
          },
          effectiveGameIdRef.current,
        );
        setLoadedSettings(response);
        setGameSettings(response, effectiveGameIdRef.current);
        setSaveErrorMessage(null);
      } catch (error) {
        setSelectedPoints(previousPoints);
        selectedPointsRef.current = previousPoints;
        setSaveErrorMessage(
          toUserErrorMessage(error, "Could not update the points. Please try again."),
        );
        clientLogger.error("settings.save-points.failed", {
          context: {
            gameId: effectiveGameIdRef.current,
            requestedPoints: points,
          },
          error,
        });
      } finally {
        setIsSaving(false);
        setSavingScope(null);
        isSavingRef.current = false;
      }
    },
    [updatePreCreateSettings],
  );

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
            disabled={isHydratingRouteSettings || (isSaving && savingScope === "game-mode")}
          />
          <SettingsTabs
            title="Points"
            options={POINTS_OPTIONS}
            selectedId={selectedPointsId}
            onChange={handlePointsClick}
            disabled={isHydratingRouteSettings || (isSaving && savingScope === "points")}
            mobileLayout="grid"
          />
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
