import React, { useCallback, useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import styles from "./Statistics.module.css";
import { AdminLayout } from "@/shared/ui/admin-layout";
import { $currentGameId } from "@/store";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/shared/ui/pagination";
import { getPlayerStats } from "@/shared/api/statistics";
import type { PlayerProps } from "@/types";
import type { SortMethod } from "@/shared/ui/sort-tabs";
import { StatisticsHeaderControls } from "@/shared/ui/statistics-header-controls";
import { sortPlayerStats } from "./lib/sort-player-stats";

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

export default function StatisticsPage(): JSX.Element {
  const currentGameId = useStore($currentGameId);
  const [sortMethod, setSortMethod] = useState<SortMethod>("alphabetically");
  const [stats, setStats] = useState<PlayerProps[]>([]);
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

    getPlayerStats(limit, offset, sortParam).then((data) => {
      if (data.items) {
        setStats(sortPlayerStats(data.items, sortMethod));
        setTotal(data.total ?? 0);
      } else if (Array.isArray(data)) {
        // Fallback for old API response
        setStats(sortPlayerStats(data, sortMethod));
        setTotal(data.length);
      }
    });
  }, [offset, sortMethod]);

  const handleSortChange = useCallback((method: SortMethod): void => {
    setSortMethod(method);
    setOffset(0);
  }, []);

  const handlePreviousPage = useCallback(() => {
    setOffset((previousOffset) => Math.max(0, previousOffset - limit));
  }, [limit]);

  const handleNextPage = useCallback(() => {
    setOffset((previousOffset) => previousOffset + limit);
  }, [limit]);

  return (
    <AdminLayout currentGameId={currentGameId}>
      <div className={styles.playerstatsContainer}>
        <div className={styles.content}>
          <StatisticsHeaderControls
            title="Playerstats"
            sortValue={sortMethod}
            onSortChange={handleSortChange}
          />
          <div className={styles.playerList}>
            {stats.map((player, index) => (
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
          <StatisticsPagination
            offset={offset}
            total={total}
            limit={limit}
            onPrevious={handlePreviousPage}
            onNext={handleNextPage}
          />
        </div>
      </div>
    </AdminLayout>
  );
}
