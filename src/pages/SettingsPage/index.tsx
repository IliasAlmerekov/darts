import React, { useState } from "react";
import { ErrorState } from "@/shared/ui/error-state";
import styles from "./SettingsPage.module.css";
import { SettingsTabs } from "./components/SettingsTabs";
import { GAME_MODE_OPTIONS } from "@/lib/game/gameMode";
import { POINTS_OPTIONS } from "./lib/points";
import { useGameSettings } from "./useGameSettings";
import { isSoundEnabled, setSoundEnabled } from "@/shared/services/browser/soundPlayer";

const SOUND_OPTIONS = [
  { label: "On", id: "on" },
  { label: "Off", id: "off" },
] as const;

function SettingsPage(): React.JSX.Element {
  const {
    selectedGameMode,
    selectedPoints,
    isDisabled,
    loadErrorMessage,
    retryLoad,
    saveErrorMessage,
    selectGameMode,
    selectPoints,
  } = useGameSettings();
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const selectSound = (id: string | number): void => {
    const enabled = id === "on";
    setSoundEnabled(enabled);
    setSoundOn(enabled);
  };

  const errorStateClassProps =
    styles.settingsError !== undefined ? { className: styles.settingsError } : {};

  return (
    <div className={styles.settings}>
      <h1>Settings</h1>
      <section className={styles.settingsSection}>
        {loadErrorMessage ? (
          <ErrorState
            {...errorStateClassProps}
            title="Could not load settings"
            message={loadErrorMessage}
            primaryAction={{ label: "Retry", onClick: retryLoad }}
          />
        ) : null}
        {saveErrorMessage ? (
          <ErrorState
            {...errorStateClassProps}
            title="Could not update settings"
            message={saveErrorMessage}
          />
        ) : null}
        <div className={styles.settingsBody}>
          <SettingsTabs
            title="Game Mode"
            options={GAME_MODE_OPTIONS}
            selectedId={selectedGameMode}
            onChange={selectGameMode}
            disabled={isDisabled}
          />
          <SettingsTabs
            title="Points"
            options={POINTS_OPTIONS}
            selectedId={selectedPoints}
            onChange={selectPoints}
            disabled={isDisabled}
            mobileLayout="grid"
          />
          <SettingsTabs
            title="Sound"
            options={SOUND_OPTIONS}
            selectedId={soundOn ? "on" : "off"}
            onChange={selectSound}
          />
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
