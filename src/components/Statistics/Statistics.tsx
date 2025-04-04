"use client";

import React, { useState } from "react";
import "./Statistics.css";
import sortAZIcon from "../../icons/sorting-az.svg";
import sortScoreIcon from "../../icons/sorting-score.svg";
import clsx from "clsx";

export default function Playerstats(): JSX.Element {
  const [activeView, setActiveView] = useState("players");
  const [sortMethod, setSortMethod] = useState("alphabetically");

  const players = [
    { id: 1, name: "Name", round: 23, games: 89 },
    { id: 2, name: "Name", round: 23, games: 89 },
    { id: 3, name: "Name", round: 23, games: 89 },
    { id: 4, name: "Name", round: 23, games: 89 },
    { id: 5, name: "Name", round: 23, games: 89 },
    { id: 6, name: "Name", round: 23, games: 89 },
    { id: 7, name: "Name", round: 23, games: 89 },
    { id: 8, name: "Name", round: 23, games: 89 },
    { id: 9, name: "Name", round: 23, games: 89 },
    { id: 10, name: "Name", round: 23, games: 89 },
    { id: 15, name: "Name", round: 23, games: 89 },
    { id: 99, name: "Name", round: 23, games: 89 },
  ];

  return (
    <div className="playerstats-container">
      <div className="content">
        <div className="navigation-item">
          <h1>Playerstats</h1>
          <div className="sort-options">
            <button
              className={clsx("sort-button", {
                activeBtn: sortMethod === "alphabetically",
              })}
              onClick={() => setSortMethod("alphabetically")}
            >
              <span className="sort-icon">
                <img src={sortAZIcon} alt="sort-icon" />
              </span>{" "}
              Alphabetically
            </button>
            <span className="separator">|</span>
            <button
              className={clsx("sort-button", {
                activeBtn: sortMethod === "score",
              })}
              onClick={() => setSortMethod("score")}
            >
              <span className="sort-icon">
                <img src={sortScoreIcon} alt="sort-icon" />
              </span>{" "}
              Score
            </button>
          </div>

          <div className="view-toggle">
            <button
              className={clsx("view-button", {
                activeBtn: activeView === "players",
              })}
              onClick={() => setActiveView("players")}
            >
              Players
            </button>
            <button
              className={clsx("view-button", {
                activeBtn: activeView === "games",
              })}
              onClick={() => setActiveView("games")}
            >
              Games
            </button>
          </div>
        </div>

        <div className="player-list">
          {players.map((player) => (
            <div key={player.id} className="player-row">
              <div className="player-number">{player.id}.</div>
              <div className="player-name">{player.name}</div>
              <div className="player-stats">
                <div className="round-stat">
                  <span className="stat-label">Ø Round</span>
                  <span className="stat-value">{player.round}</span>
                </div>
                <div className="games-stat">
                  <span className="stat-label">Played games</span>
                  <span className="stat-value">{player.games}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
