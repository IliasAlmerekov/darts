import { useEffect, useState } from "react";
import "./Statistics.css";
import sortAZIcon from "../../icons/sorting-az.svg";
import sortScoreIcon from "../../icons/sorting-score.svg";
import clsx from "clsx";
import NavigationBar from "../NavigationBar/NavigationBar";
import ViewToogleButton from "../Button/ViewToogleBtn";
import { getPlayerStats } from "../../services/api";

export default function Playerstats(): JSX.Element {
  //const { functions } = useUser();
  const [sortMethod, setSortMethod] = useState("alphabetically");
  const [stats, setStats] = useState<BASIC.PlayerProps[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 10;

  useEffect(() => {
    let sortParam = "average:desc";
    if (sortMethod === "alphabetically") {
      sortParam = "name:asc";
    } else if (sortMethod === "score") {
      sortParam = "average:desc";
    }

    getPlayerStats(limit, offset, sortParam).then((data: BASIC.PlayerDataProps) => {
      if (data.items) {
        setStats(data.items);
        setTotal(data.total);
      } else if (Array.isArray(data)) {
        // Fallback for old API response
        setStats(data);
        setTotal(data.length);
      }
      console.log("Fetched player stats:", data);
    });
  }, [offset, sortMethod]);

  const handleSortChange = (method: string) => {
    setSortMethod(method);
    setOffset(0);
  };

  return (
    <div className="playerstats-container">
      <NavigationBar />
      <div className="content">
        <div className="navigation-item">
          <h1>Playerstats</h1>
          <div className="sort-options">
            <button
              className={clsx("sort-button", {
                "active-btn": sortMethod === "alphabetically",
              })}
              onClick={() => handleSortChange("alphabetically")}
            >
              <span className="sort-icon">
                <img src={sortAZIcon} alt="sort-icon" />
              </span>{" "}
              Alphabetically
            </button>
            <span className="separator">|</span>
            <button
              className={clsx("sort-button", {
                "active-btn": sortMethod === "score",
              })}
              onClick={() => handleSortChange("score")}
            >
              <span className="sort-icon">
                <img src={sortScoreIcon} alt="sort-icon" />
              </span>{" "}
              Score
            </button>
          </div>
          <ViewToogleButton />
        </div>
        <div className="player-list">
          {stats.map((player, index) => (
            <div key={player.playerId} className="player-row">
              <div className="player-number">{offset + index + 1}.</div>
              <div className="player-name">{player.name}</div>
              <div className="player-stats">
                <div className="round-stat">
                  <span className="stat-label">
                    Ø Round{" "}
                    <span className="stat-value">{player.scoreAverage?.toFixed(1) || 0}</span>
                  </span>
                </div>
                <div className="games-stat">
                  <span className="stat-label">
                    Played games{" "}
                    <span className="stat-value">{Math.round(player.gamesPlayed || 0)}</span>
                  </span>
                </div>
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
    </div>
  );
}
