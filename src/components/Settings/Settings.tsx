import React, { useEffect, useState } from "react";
import { newSettings } from "../../stores/settings";

import Madebydeepblue from "../../icons/madeByDeepblue.svg";

import "./Settings.css";
import clsx from "clsx";

const Settings = () => {
  const [selectedGameMode, setSelectedGameMode] = useState("single-out");
  const [selectedPoints, setSelectedPoints] = useState(301);

  const gameModeBtn = [
    { label: "Single-out", id: "single-out" },
    { label: "Double-out", id: "double-out" },
    { label: "Triple-out", id: "triple-out" },
  ];

  const gamePointsBtn = [
    { label: "101", id: 101 },
    { label: "201", id: 201 },
    { label: "301", id: 301 },
    { label: "401", id: 401 },
    { label: "501", id: 501 },
  ];

  const setsBtn = [
    { label: "1", id: 1 },
    { label: "2", id: 2 },
    { label: "3", id: 3 },
    { label: "4", id: 4 },
  ];

  const legsBtn = [
    { label: "1", id: 1 },
    { label: "2", id: 2 },
    { label: "3", id: 3 },
    { label: "4", id: 4 },
  ];

  const handleGameModeClick = (id: string) => {
    setSelectedGameMode(id);
    newSettings(id, selectedPoints);
  };

  const handlePointsClick = (id: number) => {
    setSelectedPoints(id);
    newSettings(selectedGameMode, id);
  };

  useEffect(() => {
    newSettings(selectedGameMode, selectedPoints);
  }, [selectedGameMode, selectedPoints]);

  return (
    <div className="settings">
      <h1>Settings</h1>
      <section className="settings-section">
        <h2>Game</h2>
        <img className="deepblueIcon" src={Madebydeepblue} alt="" />
        <div className="settings-body">
          <div className="settings-container">
            <div className="game-settings">Game Mode</div>
            <div className="button-container">
              {gameModeBtn.map((btn) => (
                <button
                  key={btn.id}
                  className={clsx("settings-button", {
                    active: selectedGameMode === btn.id,
                  })}
                  onClick={() => handleGameModeClick(btn.id)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-container">
            <div className="game-settings">Punkte</div>
            <div className="button-container">
              {gamePointsBtn.map((btn) => (
                <button
                  key={btn.id}
                  className={clsx("settings-button", {
                    active: selectedPoints === btn.id,
                  })}
                  onClick={() => handlePointsClick(btn.id)}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-container">
            <div className="game-settings">Sätze</div>
            <div className="button-container">
              {setsBtn.map((btn) => (
                <button key={btn.id} className="settings-button">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-container">
            <div className="game-settings">Legs</div>
            <div className="button-container">
              {legsBtn.map((btn) => (
                <button key={btn.id} className="settings-button">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
