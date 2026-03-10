import React, { useCallback, useState } from "react";
import styles from "./GamesOverview.module.css";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/routes";
import Button from "@/shared/ui/button/Button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { StatisticsHeaderControls } from "@/shared/ui/statistics-header-controls";
import { useGamesOverview } from "./useGamesOverview";

const LIMIT = 9;

type GamesPaginationProps = {
  offset: number;
  total: number;
  limit: number;
  onPrevious: () => void;
  onNext: () => void;
};

const GamesPagination = React.memo(function GamesPagination({
  offset,
  total,
  limit,
  onPrevious,
  onNext,
}: GamesPaginationProps): JSX.Element {
  return (
    <Pagination className={styles.paginationControls}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious onClick={onPrevious} disabled={offset === 0} />
        </PaginationItem>
        <PaginationItem>
          <span className={styles.paginationStatus}>
            Page {Math.floor(offset / limit) + 1} of {Math.ceil(total / limit) || 1}
          </span>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext onClick={onNext} disabled={offset + limit >= total} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
});

export default function GamesOverviewPage(): JSX.Element {
  const [offset, setOffset] = useState(0);

  const { games, total, loading, error, retry } = useGamesOverview({ limit: LIMIT, offset });

  const handlePreviousPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - LIMIT));
  }, []);

  const handleNextPage = useCallback(() => {
    setOffset((prev) => prev + LIMIT);
  }, []);

  return (
    <div className={styles.gameOverview}>
      <StatisticsHeaderControls title="Games Overview" sortValue="alphabetically" sortDisabled />

      {loading && (
        <div role="status" className={styles.statusMessage}>
          Loading…
        </div>
      )}

      {!loading && error !== null && (
        <div className={styles.statusMessage}>
          <p>{error}</p>
          <div className={styles.retryAction}>
            <Button label="Retry" handleClick={retry} type="primary" />
          </div>
        </div>
      )}

      {!loading && error === null && games.length === 0 && (
        <div className={styles.statusMessage}>No games found.</div>
      )}

      {!loading && error === null && games.length > 0 && (
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
                <Link to={ROUTES.details(game.id)}>details</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <GamesPagination
        offset={offset}
        total={total}
        limit={LIMIT}
        onPrevious={handlePreviousPage}
        onNext={handleNextPage}
      />
    </div>
  );
}
