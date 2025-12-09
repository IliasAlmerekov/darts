import { useState, useMemo } from "react";
import NavigationBar from "../navigation-bar/NavigationBar";
import SettingsGroupBtn from "@/shared/ui/button/SettingsGroupBtn";
import { useStore } from "@nanostores/react";
import { $gameSettings, $currentGameId, setGameData } from "@/stores";
import { saveGameSettings } from "@/services/api";
import styles from "./Settings.module.css";

function Settings(): JSX.Element {
  const gameSettings = useStore($gameSettings);
  const currentGameId = useStore($currentGameId);
  const [isSaving, setIsSaving] = useState(false);

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
