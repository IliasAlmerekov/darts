import React from "react";
import { ErrorState } from "@/shared/ui/error-state";
import styles from "./Settings.module.css";
import { SettingsTabs } from "./components/SettingsTabs";
import { GAME_MODE_OPTIONS } from "@/lib/game/gameMode";
import { POINTS_OPTIONS } from "./lib/points";
import { useGameSettings } from "./useGameSettings";

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
        </div>
      </section>
    </div>
  );
}

export default SettingsPage;
