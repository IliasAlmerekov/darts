import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin-layout";
import { useStore } from "@nanostores/react";
import { $currentGameId, $gameData, $gameSettings, setCurrentGameId, setGameData } from "@/stores";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";
import styles from "./Settings.module.css";
import { SettingsTabs } from "../components/SettingsTabs";

const GAME_MODE_OPTIONS = [
  { label: "Single-out", id: "single-out" },
  { label: "Double-out", id: "double-out" },
  { label: "Triple-out", id: "triple-out" },
] as const;

const POINTS_OPTIONS = [
  { label: "101", id: 101 },
  { label: "201", id: 201 },
  { label: "301", id: 301 },
  { label: "401", id: 401 },
  { label: "501", id: 501 },
] as const;

function Settings(): JSX.Element {
  const gameFlow = useGameFlowPort();
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const gameData = useStore($gameData);
  const gameSettings = useStore($gameSettings);
  const currentGameIdFromStore = useStore($currentGameId);

  // Use gameId from URL if available, otherwise fall back to store
  const currentGameId = useMemo(() => {
    if (gameIdParam) {
      const parsed = Number(gameIdParam);
      return Number.isFinite(parsed) ? parsed : currentGameIdFromStore;
    }
    return currentGameIdFromStore;
  }, [gameIdParam, currentGameIdFromStore]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingScope, setSavingScope] = useState<"game-mode" | "points" | null>(null);
  const initialGameMode: "single-out" | "double-out" | "triple-out" = gameSettings
    ? gameSettings.doubleOut
      ? "double-out"
      : gameSettings.tripleOut
        ? "triple-out"
        : "single-out"
    : "single-out";
  const initialPoints = gameSettings?.startScore ?? 301;
  const [selectedGameMode, setSelectedGameMode] = useState<
    "single-out" | "double-out" | "triple-out"
  >(initialGameMode);
  const [selectedPoints, setSelectedPoints] = useState<number>(initialPoints);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(() => Boolean(gameSettings));
  const selectedGameModeRef = useRef(selectedGameMode);
  const selectedPointsRef = useRef(selectedPoints);
  const effectiveGameIdRef = useRef<number | null>(null);
  const isSavingRef = useRef(false);

  // Update store with gameId from URL or already loaded game data.
  useEffect(() => {
    const resolvedGameId = currentGameId ?? gameData?.id ?? null;
    if (resolvedGameId && resolvedGameId !== currentGameIdFromStore) {
      setCurrentGameId(resolvedGameId);
    }
  }, [currentGameId, currentGameIdFromStore, gameData?.id]);

  useEffect(() => {
    setHasHydratedSelection(false);
  }, [currentGameId]);

  // Load game settings from backend on mount or when gameId changes
  useEffect(() => {
    if (!currentGameId) {
      return;
    }

    const loadGameSettings = async () => {
      try {
        const gameData = await gameFlow.getGameThrows(currentGameId);
        setGameData(gameData);
      } catch (error) {
        console.error("Failed to load game settings:", error);
      }
    };

    const hasCurrentGameInStore = gameData?.id === currentGameId;
    if (!hasCurrentGameInStore) {
      void loadGameSettings();
      return;
    }
  }, [currentGameId, gameData?.id, gameFlow]);

  // Mapping zwischen Backend-Settings und UI-Darstellung
  const currentGameMode = useMemo(() => {
    if (!gameSettings) return "single-out";
    if (gameSettings.doubleOut) return "double-out";
    if (gameSettings.tripleOut) return "triple-out";
    return "single-out";
  }, [gameSettings]);

  const currentPoints = gameSettings?.startScore ?? 301;
  const effectiveGameId = currentGameId ?? gameData?.id ?? null;

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
    if (!gameSettings) {
      return;
    }
    if (effectiveGameId && gameData?.id !== effectiveGameId) {
      return;
    }

    setSelectedGameMode(currentGameMode);
    setSelectedPoints(currentPoints);
    setHasHydratedSelection(true);
  }, [
    currentGameMode,
    currentPoints,
    effectiveGameId,
    gameData?.id,
    gameSettings,
    hasHydratedSelection,
  ]);

  const handleGameModeClick = useCallback(
    async (id: string | number) => {
      if (isSavingRef.current) return;

      const mode = id.toString() as "single-out" | "double-out" | "triple-out";
      const isDoubleOut = mode === "double-out";
      const isTripleOut = mode === "triple-out";
      const previousMode = selectedGameModeRef.current;
      setSelectedGameMode(mode);
      selectedGameModeRef.current = mode;

      setIsSaving(true);
      setSavingScope("game-mode");
      isSavingRef.current = true;

      try {
        const response = await gameFlow.saveGameSettings(
          {
            startScore: selectedPointsRef.current,
            doubleOut: isDoubleOut,
            tripleOut: isTripleOut,
          },
          effectiveGameIdRef.current,
        );
        // Aktualisiere gameData mit der Response für sofortiges visuelles Feedback
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
    },
    [gameFlow],
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

      setIsSaving(true);
      setSavingScope("points");
      isSavingRef.current = true;

      try {
        const response = await gameFlow.saveGameSettings(
          {
            startScore: points,
            doubleOut: isDoubleOut,
            tripleOut: isTripleOut,
          },
          effectiveGameIdRef.current,
        );
        // Aktualisiere gameData mit der Response für sofortiges visuelles Feedback
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
    },
    [gameFlow],
  );

  return (
    <AdminLayout>
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

export default Settings;
