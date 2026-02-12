import { useEffect, useState } from "react";
import styles from "./GamesOverview.module.css";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/components/admin-layout";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/pagination";
import { getGamesOverview } from "../api";
import { StatisticsHeaderControls } from "../components/header-controls";

export default function GamesOverview(): JSX.Element {
  // Read gameId from store but don't modify it - just keep it alive
  const [games, setGames] = useState<BASIC.FinishedGameProps[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 9;

  useEffect(() => {
    getGamesOverview(limit, offset).then((response) => {
      const data = response as BASIC.GameDataProps;
      if (data.items) {
        setGames(data.items);
        setTotal(data.total);
      } else if (Array.isArray(data)) {
        setGames(data);
        setTotal(data.length);
      }
    });
  }, [offset]);

  return (
    <AdminLayout>
      <div className={styles.gameOverview}>
        <StatisticsHeaderControls title="Games Overview" sortValue="alphabetically" sortDisabled />
        <div className={styles.overview}>
          {games.map((game) => (
            <div key={game.id} className={styles.gameContainer}>
              <div className={styles.gameCard}>
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
              <div className={styles.detailsLink}>
                <Link to={`/details/${game.id}`}>details</Link>
              </div>
            </div>
          ))}
        </div>
        <Pagination className={styles.paginationControls}>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
              />
            </PaginationItem>
            <PaginationItem>
              <span className={styles.paginationStatus}>
                Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit) || 1}
              </span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </AdminLayout>
  );
}
