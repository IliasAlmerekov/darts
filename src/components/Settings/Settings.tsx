import NavigationBar from "../NavigationBar/NavigationBar";
import SettingsGroupBtn from "../Button/SettingsGroupBtn";
import { useStore } from "@nanostores/react";
import { $settings, newSettings } from "../../stores";

import "./Settings.css";

function Settings(): JSX.Element {
  const settings = useStore($settings);

  const handleGameModeClick = (id: string | number) => {
    const mode = id.toString();
    newSettings(mode, settings.points);
  };

  const handlePointsClick = (id: string | number) => {
    const points = Number(id);
    newSettings(settings.gameMode, points);
  };

  return (
    <div className="settings">
      <NavigationBar />
      <h1>Settings</h1>
      <section className="settings-section">
        <h2>Game</h2>
        <div className="settings-body">
          <SettingsGroupBtn
            title="Game Mode"
            options={[
              { label: "Single-out", id: "single-out" },
              { label: "Double-out", id: "double-out" },
              { label: "Triple-out", id: "triple-out" },
            ]}
            selectedId={settings.gameMode}
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
            selectedId={settings.points}
            onClick={handlePointsClick}
          />
        </div>
      </section>
    </div>
  );
}

export default Settings;
