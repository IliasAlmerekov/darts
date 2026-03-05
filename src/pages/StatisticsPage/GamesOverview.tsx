import React, { useCallback, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import styles from "./GamesOverview.module.css";
import { Link } from "react-router-dom";
import { AdminLayout } from "@/shared/ui/admin-layout";
import { $currentGameId } from "@/store";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { getGamesOverview } from "@/shared/api/statistics";
import type { FinishedGameProps, GameDataProps } from "@/types";
import { StatisticsHeaderControls } from "./components/header-controls";

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
  const currentGameId = useStore($currentGameId);
  const [games, setGames] = useState<FinishedGameProps[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 9;

  useEffect(() => {
    getGamesOverview(limit, offset).then((response) => {
      const data = response as GameDataProps;
      if (data.items) {
        setGames(data.items);
        setTotal(data.total ?? 0);
      } else if (Array.isArray(data)) {
        setGames(data);
        setTotal(data.length);
      }
    });
  }, [offset]);

  const handlePreviousPage = useCallback(() => {
    setOffset((previousOffset) => Math.max(0, previousOffset - limit));
  }, [limit]);

  const handleNextPage = useCallback(() => {
    setOffset((previousOffset) => previousOffset + limit);
  }, [limit]);

  return (
    <AdminLayout currentGameId={currentGameId}>
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
        <GamesPagination
          offset={offset}
          total={total}
          limit={limit}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      </div>
    </AdminLayout>
  );
}
