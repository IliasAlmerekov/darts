import { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom";
import NavigationBar from "@/components/navigation-bar/NavigationBar";
import SettingsGroupBtn from "@/components/button/SettingsGroupBtn";
import { useStore } from "@nanostores/react";
import { $gameSettings, $currentGameId, setGameData, setCurrentGameId } from "@/stores";
import { saveGameSettings, getGameThrows } from "@/services/api";
import styles from "./Settings.module.css";

function Settings(): JSX.Element {
  const { id: gameIdParam } = useParams<{ id?: string }>();
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
  const [isLoading, setIsLoading] = useState(true);

  // Update store with gameId from URL
  useEffect(() => {
    if (currentGameId && currentGameId !== currentGameIdFromStore) {
      setCurrentGameId(currentGameId);
    }
  }, [currentGameId, currentGameIdFromStore]);

  // Load game settings from backend on mount or when gameId changes
  useEffect(() => {
    if (!currentGameId) {
      setIsLoading(false);
      return;
    }

    const loadGameSettings = async () => {
      setIsLoading(true);
      try {
        const gameData = await getGameThrows(currentGameId);
        setGameData(gameData);
      } catch (error) {
        console.error("Failed to load game settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadGameSettings();
  }, [currentGameId]);

  // Mapping zwischen Backend-Settings und UI-Darstellung
  const currentGameMode = useMemo(() => {
    if (!gameSettings) return "single-out";
    if (gameSettings.doubleOut) return "double-out";
    if (gameSettings.tripleOut) return "triple-out";
    return "single-out";
  }, [gameSettings]);

  const currentPoints = gameSettings?.startScore ?? 301;

  const handleGameModeClick = async (id: string | number) => {
    if (isSaving) return;

    const mode = id.toString();
    const isDoubleOut = mode === "double-out";
    const isTripleOut = mode === "triple-out";

    setIsSaving(true);

    try {
      const response = await saveGameSettings(
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
      console.error("Failed to save game mode:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePointsClick = async (id: string | number) => {
    if (isSaving) return;

    const points = Number(id);
    const isDoubleOut = currentGameMode === "double-out";
    const isTripleOut = currentGameMode === "triple-out";

    setIsSaving(true);

    try {
      const response = await saveGameSettings(
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
      console.error("Failed to save points:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.settings}>
        <NavigationBar />
        <h1>Settings</h1>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div className={styles.settings}>
      <NavigationBar />
      <h1>Settings</h1>
      <section className={styles.settingsSection}>
        <h2>Game</h2>
        <div className={styles.settingsBody}>
          <SettingsGroupBtn
            title="Game Mode"
            options={[
              { label: "Single-out", id: "single-out" },
              { label: "Double-out", id: "double-out" },
              { label: "Triple-out", id: "triple-out" },
            ]}
            selectedId={currentGameMode}
            onClick={handleGameModeClick}
          />
          <SettingsGroupBtn
            title="Punkte"
            options={[
              { label: "101", id: 101 },
              { label: "201", id: 201 },
              { label: "301", id: 301 },
              { label: "401", id: 401 },
              { label: "501", id: 501 },
            ]}
            selectedId={currentPoints}
            onClick={handlePointsClick}
          />
        </div>
      </section>
    </div>
  );
}

export default Settings;
