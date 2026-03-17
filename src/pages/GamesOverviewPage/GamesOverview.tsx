import React, { useCallback } from "react";
import styles from "./GamesOverview.module.css";
import { Link, useSearchParams } from "react-router-dom";
import { ROUTES } from "@/lib/router/routes";
import { Button } from "@/shared/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { StatisticsHeaderControls } from "@/shared/ui/statistics-header-controls";
import type { FinishedGameProps } from "@/types";
import { useGamesOverview } from "./useGamesOverview";

const LIMIT = 9;
const DEFAULT_SORT_VALUE = "alphabetically" as const;
const GAMES_OVERVIEW_ERROR_MESSAGE = "Could not load games overview";

type RenderableFinishedGame = FinishedGameProps & {
  winnerName: string;
  date: string;
};

function isRenderableFinishedGame(game: FinishedGameProps): game is RenderableFinishedGame {
  if (typeof game.winnerName !== "string" || game.winnerName.trim().length === 0) {
    return false;
  }

  if (typeof game.date !== "string") {
    return false;
  }

  const parsedDate = new Date(game.date);
  return !Number.isNaN(parsedDate.getTime());
}

interface GamesPaginationProps {
  offset: number;
  total: number;
  limit: number;
  onPrevious: () => void;
  onNext: () => void;
}

const GamesPagination = React.memo(function GamesPagination({
  offset,
  total,
  limit,
  onPrevious,
  onNext,
}: GamesPaginationProps): React.JSX.Element {
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

export default function GamesOverviewPage(): React.JSX.Element {
  const [searchParams, setSearchParams] = useSearchParams();
  const offset = Number(searchParams.get("offset") ?? "0");

  const { games, total, loading, error, retry } = useGamesOverview();
  const renderableGames = games.filter(isRenderableFinishedGame);
  const hasInvalidGameData = renderableGames.length !== games.length;
  const resolvedError = error ?? (hasInvalidGameData ? GAMES_OVERVIEW_ERROR_MESSAGE : null);

  const handlePreviousPage = useCallback(() => {
    setSearchParams((prev) => {
      const newOffset = Math.max(0, Number(prev.get("offset") ?? "0") - LIMIT);
      if (newOffset === 0) {
        prev.delete("offset");
      } else {
        prev.set("offset", String(newOffset));
      }
      return prev;
    });
  }, [setSearchParams]);

  const handleNextPage = useCallback(() => {
    setSearchParams((prev) => {
      prev.set("offset", String(Number(prev.get("offset") ?? "0") + LIMIT));
      return prev;
    });
  }, [setSearchParams]);

  const formatGameDate = useCallback((value: string): string => {
    const parsedDate = new Date(value);
    return parsedDate.toLocaleDateString("de-De", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  return (
    <div className={styles.gameOverview}>
      <StatisticsHeaderControls
        title="Games Overview"
        sortValue={DEFAULT_SORT_VALUE}
        sortDisabled
      />

      {loading && (
        <div role="status" className={styles.statusMessage}>
          Loading…
        </div>
      )}

      {!loading && resolvedError !== null && (
        <div className={styles.statusMessage}>
          <p>{resolvedError}</p>
          <div className={styles.retryAction}>
            <Button label="Retry" handleClick={retry} type="primary" />
          </div>
        </div>
      )}

      {!loading && resolvedError === null && renderableGames.length === 0 && (
        <div className={styles.statusMessage}>No games found.</div>
      )}

      {!loading && resolvedError === null && renderableGames.length > 0 && (
        <div className={styles.overview}>
          {renderableGames.map((game) => (
            <div key={game.id} className={styles.gameContainer}>
              <div className={styles.gameCard}>
                <h4>{formatGameDate(game.date)}</h4>
                <p>
                  <span className={styles.statLabel}>
                    Players <span className={styles.statValue}>{game.playersCount}</span>
                  </span>
                </p>
                <p>
                  <span className={styles.statLabel}>
                    Player Won: <span className={styles.statValue}>{game.winnerName}</span>
                  </span>
                </p>
                <p>
                  <span className={styles.statLabel}>
                    Rounds: <span className={styles.statValue}>{game.winnerRounds}</span>
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
