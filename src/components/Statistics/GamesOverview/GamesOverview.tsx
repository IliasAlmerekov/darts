import { useEffect, useState } from "react";
import "./GamesOverview.css";
import { Link } from "react-router-dom";
import NavigationBar from "@/components/navigation-bar/NavigationBar";
import ViewToogleButton from "@/components/button/ViewToogleBtn";
import { getGamesOverview } from "@/services/api";

export default function GamesOverview(): JSX.Element {
  const [games, setGames] = useState<BASIC.FinishedGameProps[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 9;

  useEffect(() => {
    getGamesOverview(limit, offset).then((data: BASIC.GameDataProps) => {
      if (data.items) {
        setGames(data.items);
        setTotal(data.total);
      } else if (Array.isArray(data)) {
        setGames(data);
        setTotal(data.length);
      }
      console.log("Fetched game overview:", data);
    });
  }, [offset]);

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
                    Players <span className="stat-value">{game.playersCount}</span>
                  </span>
                </p>
                <p>
                  {" "}
                  <span className="stat-label">
                    Player Won: <span className="stat-value">{game.winnerName}</span>
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
                <Link to={`/details/${game.id}`}>details</Link>
              </div>
            </div>
          ))}
      </div>
      <div
        className="pagination-controls"
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          marginTop: "20px",
          paddingBottom: "20px",
        }}
      >
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="sort-button"
          style={{ opacity: offset === 0 ? 0.5 : 1 }}
        >
          Previous
        </button>
        <span style={{ alignSelf: "center" }}>
          Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit) || 1}
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
          className="sort-button"
          style={{ opacity: offset + limit >= total ? 0.5 : 1 }}
        >
          Next
        </button>
      </div>
    </div>
  );
}
