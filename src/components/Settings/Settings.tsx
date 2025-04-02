import React, { useState } from "react";
import { newSettings } from "../../stores/settings";

import Madebydeepblue from "../../icons/madeByDeepblue.svg";

import "./Settings.css";

const Settings = () => {
  const [selectedGameMode, setSelectedGameMode] = useState("single-out");
  const [selectedPoints, setSelectedPoints] = useState(301);

  const handleGameModeClick = (gameMode: string) => {
    setSelectedGameMode(gameMode);
    newSettings(gameMode, selectedPoints);
  };

  const handlePointsClick = (points: number) => {
    setSelectedPoints(points);
    newSettings(selectedGameMode, points);
  };

  return (
    <div className="settingsOverlay">
      <p className="overlayHeading">Settings</p>
      <img className="deepblueIcon" src={Madebydeepblue} alt="" />
      <div className="overlayBody">
        <div className="settingsContainer">
          <div>Game Mode</div>
          <div className="buttonContainer">
            <button
              className={`${selectedGameMode === "single-out" ? "active" : ""}`}
              onClick={() => handleGameModeClick("single-out")}
            >
              Single-out
            </button>
            <button
              className={`${selectedGameMode === "double-out" ? "active" : ""}`}
              onClick={() => handleGameModeClick("double-out")}
            >
              Double-out
            </button>
            <button
              className={`${selectedGameMode === "triple-out" ? "active" : ""}`}
              onClick={() => handleGameModeClick("triple-out")}
            >
              Triple-out
            </button>
          </div>
        </div>
        <div className="settingsContainer">
          <div>Punkte</div>
          <div className="buttonContainer">
            <button
              className={`${selectedPoints === 101 ? "active" : ""}`}
              onClick={() => handlePointsClick(101)}
            >
              101
            </button>
            <button
              className={`${selectedPoints === 201 ? "active" : ""}`}
              onClick={() => handlePointsClick(201)}
            >
              201
            </button>
            <button
              className={`${selectedPoints === 301 ? "active" : ""}`}
              onClick={() => handlePointsClick(301)}
            >
              301
            </button>
            <button
              className={`${selectedPoints === 401 ? "active" : ""}`}
              onClick={() => handlePointsClick(401)}
            >
              401
            </button>
            <button
              className={`${selectedPoints === 501 ? "active" : ""}`}
              onClick={() => handlePointsClick(501)}
            >
              501
            </button>
          </div>
        </div>
        {/* <div className="settingsContainer">
              <div>Sätze</div>
              <div className="buttonContainer">
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <button>4</button>
              </div>
            </div>
            <div className="settingsContainer">
              <div>Legs</div>
              <div className="buttonContainer">
                <button className="active">1</button>
                <button>2</button>
                <button>3</button>
                <button>4</button>
              </div>
            </div> */}
      </div>
    </div>
  );
};

export default Settings;
