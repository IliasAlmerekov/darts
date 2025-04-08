import React from "react";
import "./GamesOverview.css";
import { useUser } from "../../provider/UserProvider";
import { Link } from "react-router-dom";

export default function GamesOverview(): JSX.Element {
  const { functions } = useUser();
  const games = functions.getFinishedGamesSummary();
  return (
    <div className="overview">
      {games.map((game, index) => (
        <div key={index} className="game-container">
          <div className="game-card">
            <h4>{new Date(game.date).toLocaleDateString("de-De")}</h4>
            <p>
              <span className="stat-label">
                Players <span className="stat-value">{game.playersCount}</span>
              </span>
            </p>
            <p>
              {" "}
              <span className="stat-label">
                Player Won:{" "}
                <span className="stat-value">{game.winnerName}</span>
              </span>
            </p>
            <p>
              {" "}
              <span className="stat-label">
                Rounds: <span className="stat-value">{game.winnerRounds}</span>
              </span>
            </p>
          </div>
          <div className="details-link">
            <Link to="/details">details</Link>
          </div>
        </div>
      ))}
    </div>
  );
}
