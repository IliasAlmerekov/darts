"use client";

import React, { useEffect, useState } from "react";
import "./Statistics.css";
import sortAZIcon from "../../icons/sorting-az.svg";
import sortScoreIcon from "../../icons/sorting-score.svg";
import clsx from "clsx";
import { useUser } from "../../provider/UserProvider";
import GamesOverview from "../GamesOverview/GamesOverview";

export default function Playerstats(): JSX.Element {
  const { functions } = useUser();
  const [activeView, setActiveView] = useState("players");
  const [sortMethod, setSortMethod] = useState("alphabetically");
  const allStats = functions.getAllPlayerStats();

  const sortedStats = [...allStats].sort((a, b) => {
    if (sortMethod === "alphabetically") {
      return a.name.localeCompare(b.name);
    }
    if (sortMethod === "score") {
      return b.averageRoundScore - a.averageRoundScore;
    }
    return 0;
  });

  useEffect(() => {}, [sortedStats]);

  return (
    <div className="playerstats-container">
      <div className="content">
        <div className="navigation-item">
          {activeView === "players" ? (
            <h1>Playerstats</h1>
          ) : (
            <h1>Games Overview</h1>
          )}
          {activeView === "players" ? (
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
          ) : (
            ""
          )}

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
        {activeView === "players" ? (
          <div className="player-list">
            {sortedStats.map((player, index) => (
              <div key={player.id} className="player-row">
                <div className="player-number">{index + 1}.</div>
                <div className="player-name">{player.name}</div>
                <div className="player-stats">
                  <div className="round-stat">
                    <span className="stat-label">
                      Ø Round{" "}
                      <span className="stat-value">
                        {Math.floor(player.averageRoundScore)}
                      </span>
                    </span>
                  </div>
                  <div className="games-stat">
                    <span className="stat-label">
                      Played games{" "}
                      <span className="stat-value">
                        {Math.floor(player.games)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <GamesOverview />
        )}
      </div>
    </div>
  );
}
