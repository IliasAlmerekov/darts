import React from "react";
import NavigationBar from "../NavigationBar/NavigationBar";
import SettingsGroupBtn from "../Button/SettingsGroupBtn";

import "./Settings.css";
import { useUser } from "../../provider/UserProvider";

const Settings = () => {
  const { event, functions } = useUser();

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
            selectedId={event.selectedGameMode}
            onClick={functions.handleGameModeClick}
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
            selectedId={event.selectedPoints}
            onClick={functions.handlePointsClick}
          />
        </div>
      </section>
    </div>
  );
};

export default Settings;
