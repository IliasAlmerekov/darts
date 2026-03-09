import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { AdminLayout } from "@/shared/ui/admin-layout";
import { useStore } from "@nanostores/react";
import { $gameData, $gameSettings, setGameData } from "@/store";
import { $currentGameId, setCurrentGameId } from "@/store";
import { getGameThrows, saveGameSettings } from "@/shared/api/game";
import type { GameMode } from "@/types";
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

function SettingsPage(): JSX.Element {
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const gameData = useStore($gameData);
  const gameSettings = useStore($gameSettings);
  const currentGameIdFromStore = useStore($currentGameId);

  const routeGameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingScope, setSavingScope] = useState<"game-mode" | "points" | null>(null);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>("single-out");
  const [selectedPoints, setSelectedPoints] = useState<number>(301);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const selectedGameModeRef = useRef(selectedGameMode);
  const selectedPointsRef = useRef(selectedPoints);
  const effectiveGameIdRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);
  const activeGameSettings =
    routeGameId !== null && gameData?.id === routeGameId ? gameSettings : null;

  // Keep the session store aligned only with the canonical route id.
  useEffect(() => {
    if (routeGameId !== null && routeGameId !== currentGameIdFromStore) {
      setCurrentGameId(routeGameId);
    }
  }, [routeGameId, currentGameIdFromStore]);

  useEffect(() => {
    setHasHydratedSelection(false);
    if (routeGameId === null) {
      setSelectedGameMode("single-out");
      setSelectedPoints(301);
    }
  }, [routeGameId]);

  // Load settings only for the explicit route game id.
  useEffect(() => {
    if (!routeGameId) {
      return;
    }

    const loadGameSettings = async () => {
      try {
        const loadedGameData = await getGameThrows(routeGameId);
        setGameData(loadedGameData);
      } catch (error) {
        console.error("Failed to load game settings:", error);
      }
    };

    const hasCurrentGameInStore = gameData?.id === routeGameId;
    if (!hasCurrentGameInStore) {
      void loadGameSettings();
    }
  }, [routeGameId, gameData?.id]);

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
    if (hasHydratedSelection) {
      return;
    }
    if (!activeGameSettings) {
      return;
    }

    setSelectedGameMode(currentGameMode);
    setSelectedPoints(currentPoints);
    setHasHydratedSelection(true);
  }, [activeGameSettings, currentGameMode, currentPoints, hasHydratedSelection]);

  const handleGameModeClick = useCallback(async (id: string | number) => {
    if (isSavingRef.current) return;
    if (!isGameMode(id)) return;
    if (!effectiveGameIdRef.current) return;

    const mode = id;
    const isDoubleOut = mode === "double-out";
    const isTripleOut = mode === "triple-out";
    const previousMode = selectedGameModeRef.current;
    setSelectedGameMode(mode);
    selectedGameModeRef.current = mode;

    setIsSaving(true);
    setSavingScope("game-mode");
    isSavingRef.current = true;

    try {
      const response = await saveGameSettings(
        {
          startScore: selectedPointsRef.current,
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        },
        effectiveGameIdRef.current,
      );
      setGameData(response);
    } catch (error) {
      setSelectedGameMode(previousMode);
      selectedGameModeRef.current = previousMode;
      console.error("Failed to save game mode:", error);
    } finally {
      setIsSaving(false);
      setSavingScope(null);
      isSavingRef.current = false;
    }
  }, []);

  const handlePointsClick = useCallback(async (id: string | number) => {
    if (isSavingRef.current) return;
    if (!effectiveGameIdRef.current) return;

    const points = Number(id);
    const currentMode = selectedGameModeRef.current;
    const isDoubleOut = currentMode === "double-out";
    const isTripleOut = currentMode === "triple-out";
    const previousPoints = selectedPointsRef.current;
    setSelectedPoints(points);
    selectedPointsRef.current = points;

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
      setGameData(response);
    } catch (error) {
      setSelectedPoints(previousPoints);
      selectedPointsRef.current = previousPoints;
      console.error("Failed to save points:", error);
    } finally {
      setIsSaving(false);
      setSavingScope(null);
      isSavingRef.current = false;
    }
  }, []);

  return (
    <AdminLayout currentGameId={currentGameIdFromStore}>
      <div className={styles.settings}>
        <h1>Settings</h1>
        <section className={styles.settingsSection}>
          <div className={styles.settingsBody}>
            <SettingsTabs
              title="Game Mode"
              options={GAME_MODE_OPTIONS}
              selectedId={selectedGameMode}
              onChange={handleGameModeClick}
              disabled={isSaving && savingScope === "game-mode"}
            />
            <SettingsTabs
              title="Points"
              options={POINTS_OPTIONS}
              selectedId={selectedPoints}
              onChange={handlePointsClick}
              disabled={isSaving && savingScope === "points"}
              mobileLayout="grid"
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default SettingsPage;
