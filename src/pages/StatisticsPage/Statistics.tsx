import React, { useCallback, useState } from "react";
import styles from "./Statistics.module.css";
import Button from "@/shared/ui/button/Button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import type { SortMethod } from "@/shared/ui/sort-tabs";
import { StatisticsHeaderControls } from "@/shared/ui/statistics-header-controls";
import { sortPlayerStats } from "./lib/sort-player-stats";
import { usePlayerStats } from "./usePlayerStats";

const LIMIT = 10;

type StatisticsPaginationProps = {
  offset: number;
  total: number;
  limit: number;
  onPrevious: () => void;
  onNext: () => void;
};

const StatisticsPagination = React.memo(function StatisticsPagination({
  offset,
  total,
  limit,
  onPrevious,
  onNext,
}: StatisticsPaginationProps): JSX.Element {
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

function sortParamFromMethod(method: SortMethod): string | undefined {
  if (method === "alphabetically") return undefined;
  return "average:desc";
}

export default function StatisticsPage(): JSX.Element {
  const [sortMethod, setSortMethod] = useState<SortMethod>("alphabetically");
  const [offset, setOffset] = useState(0);

  const sortParam = sortParamFromMethod(sortMethod);
  const { stats, total, loading, error, retry } = usePlayerStats({
    limit: LIMIT,
    offset,
    sortParam,
  });

  const sorted = sortPlayerStats(stats, sortMethod);

  const handleSortChange = useCallback((method: SortMethod): void => {
    setSortMethod(method);
    setOffset(0);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setOffset((prev) => Math.max(0, prev - LIMIT));
  }, []);

  const handleNextPage = useCallback(() => {
    setOffset((prev) => prev + LIMIT);
  }, []);

  return (
    <div className={styles.playerstatsContainer}>
      <div className={styles.content}>
        <StatisticsHeaderControls
          title="Playerstats"
          sortValue={sortMethod}
          onSortChange={handleSortChange}
        />
        {!loading && error !== null && (
          <div className={styles.statusMessage}>
            <p>{error}</p>
            <div className={styles.retryAction}>
              <Button label="Retry" handleClick={retry} type="primary" />
            </div>
          </div>
        )}

        {!loading && error === null && sorted.length === 0 && (
          <div className={styles.statusMessage}>No player statistics available.</div>
        )}

        {error === null && sorted.length > 0 && (
          <div className={styles.playerList}>
            {sorted.map((player, index) => (
              <div key={player.playerId} className={styles.playerRow}>
                <div className={styles.playerNumber}>{offset + index + 1}.</div>
                <div className={styles.playerName}>{player.name}</div>
                <div className={styles.playerStats}>
                  <div className={styles.roundStat}>
                    <span className={styles.statLabel}>Ø Round</span>
                    <span className={styles.statValue}>{player.scoreAverage?.toFixed(1) || 0}</span>
                  </div>
                  <div className={styles.gamesStat}>
                    <span className={styles.statLabel}>Played games</span>
                    <span className={styles.statValue}>{Math.round(player.gamesPlayed || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <StatisticsPagination
          offset={offset}
          total={total}
          limit={LIMIT}
          onPrevious={handlePreviousPage}
          onNext={handleNextPage}
        />
      </div>
    </div>
  );
}
