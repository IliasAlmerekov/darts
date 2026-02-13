import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin-layout";
import { useStore } from "@nanostores/react";
import { $currentGameId, $gameData, $gameSettings, setCurrentGameId, setGameData } from "@/stores";
import { useGameFlowPort } from "@/shared/providers/GameFlowPortProvider";
import styles from "./Settings.module.css";
import { SettingsTabs } from "../components/SettingsTabs";

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
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<"single-out" | "double-out" | "triple-out">(
    "single-out",
  );
  const [selectedPoints, setSelectedPoints] = useState<number>(301);

  // Update store with gameId from URL
  useEffect(() => {
    if (currentGameId && currentGameId !== currentGameIdFromStore) {
      setCurrentGameId(currentGameId);
    }
  }, [currentGameId, currentGameIdFromStore]);

  // Load game settings from backend on mount or when gameId changes
  useEffect(() => {
    if (!currentGameId) {
      setIsSyncing(false);
      return;
    }

    const loadGameSettings = async (showSyncHint: boolean) => {
      if (showSyncHint) {
        setIsSyncing(true);
      }

      try {
        const gameData = await gameFlow.getGameThrows(currentGameId);
        setGameData(gameData);
      } catch (error) {
        console.error("Failed to load game settings:", error);
      } finally {
        if (showSyncHint) {
          setIsSyncing(false);
        }
      }
    };

    const hasCurrentGameInStore = gameData?.id === currentGameId;
    if (!hasCurrentGameInStore) {
      void loadGameSettings(true);
      return;
    }

    // We already have local data for this game, so do a silent background refresh.
    void loadGameSettings(false);
  }, [currentGameId, gameData?.id, gameFlow]);

  // Mapping zwischen Backend-Settings und UI-Darstellung
  const currentGameMode = useMemo(() => {
    if (!gameSettings) return "single-out";
    if (gameSettings.doubleOut) return "double-out";
    if (gameSettings.tripleOut) return "triple-out";
    return "single-out";
  }, [gameSettings]);

  const currentPoints = gameSettings?.startScore ?? 301;

  useEffect(() => {
    setSelectedGameMode(currentGameMode);
  }, [currentGameMode]);

  useEffect(() => {
    setSelectedPoints(currentPoints);
  }, [currentPoints]);

  const controlsDisabled = isSaving || !currentGameId;

  const handleGameModeClick = async (id: string | number) => {
    if (isSaving || !currentGameId) return;

    const mode = id.toString() as "single-out" | "double-out" | "triple-out";
    const isDoubleOut = mode === "double-out";
    const isTripleOut = mode === "triple-out";
    const previousMode = selectedGameMode;
    setSelectedGameMode(mode);

    setIsSaving(true);

    try {
      const response = await gameFlow.saveGameSettings(
        {
          startScore: currentPoints,
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        },
        currentGameId,
      );
      // Aktualisiere gameData mit der Response für sofortiges visuelles Feedback
      setGameData(response);
    } catch (error) {
      setSelectedGameMode(previousMode);
      console.error("Failed to save game mode:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePointsClick = async (id: string | number) => {
    if (isSaving || !currentGameId) return;

    const points = Number(id);
    const isDoubleOut = selectedGameMode === "double-out";
    const isTripleOut = selectedGameMode === "triple-out";
    const previousPoints = selectedPoints;
    setSelectedPoints(points);

    setIsSaving(true);

    try {
      const response = await gameFlow.saveGameSettings(
        {
          startScore: points,
          doubleOut: isDoubleOut,
          tripleOut: isTripleOut,
        },
        currentGameId,
      );
      // Aktualisiere gameData mit der Response für sofortiges visuelles Feedback
      setGameData(response);
    } catch (error) {
      setSelectedPoints(previousPoints);
      console.error("Failed to save points:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.settings}>
        <h1>Settings</h1>
        {isSyncing ? <p className={styles.syncHint}>Syncing settings…</p> : null}
        <section className={styles.settingsSection}>
          <div className={styles.settingsBody}>
            <SettingsTabs
              title="Game Mode"
              options={[
                { label: "Single-out", id: "single-out" },
                { label: "Double-out", id: "double-out" },
                { label: "Triple-out", id: "triple-out" },
              ]}
              selectedId={selectedGameMode}
              onChange={handleGameModeClick}
              disabled={controlsDisabled}
            />
            <SettingsTabs
              title="Points"
              options={[
                { label: "101", id: 101 },
                { label: "201", id: 201 },
                { label: "301", id: 301 },
                { label: "401", id: 401 },
                { label: "501", id: 501 },
              ]}
              selectedId={selectedPoints}
              onChange={handlePointsClick}
              disabled={controlsDisabled}
              mobileLayout="grid"
            />
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

export default Settings;
