import React from "react";
import "./GamesOverview.css";
import { useUser } from "../../../provider/UserProvider";
import { Link } from "react-router-dom";
import NavigationBar from "../../NavigationBar/NavigationBar";
import ViewToogleButton from "../../Button/ViewToogleBtn";

export default function GamesOverview(): JSX.Element {
  const { functions } = useUser();
  const games = functions.getFinishedGamesSummary();
  return (
    <div className="game-overview">
      <NavigationBar />
      <div className="heading">
        <h1>Games Overview</h1>
        <ViewToogleButton />
      </div>
      <div className="overview">
        {games
          .slice()
          .reverse()
          .map((game, index) => (
            <div key={index} className="game-container">
              <div className="game-card">
                <h4>
                  {" "}
                  {new Date(game.date).toLocaleDateString("de-De", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}{" "}
                </h4>
                <p>
                  <span className="stat-label">
                    Players{" "}
                    <span className="stat-value">{game.playersCount}</span>
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
                    Rounds:{" "}
                    <span className="stat-value">{game.winnerRounds}</span>
                  </span>
                </p>
              </div>
              <div className="details-link">
                <Link to={`/details/${game.id}`}>details</Link>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
