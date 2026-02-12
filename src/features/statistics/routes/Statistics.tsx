import { useEffect, useState } from "react";
import styles from "./Statistics.module.css";
import { AdminLayout } from "@/components/admin-layout";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/pagination";
import { getPlayerStats } from "../api";
import type { SortMethod } from "../components/sort-tabs";
import { StatisticsHeaderControls } from "../components/header-controls";
import { sortPlayerStats } from "../lib/sort-player-stats";

export default function Playerstats(): JSX.Element {
  const [sortMethod, setSortMethod] = useState<SortMethod>("alphabetically");
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

    getPlayerStats(limit, offset, sortParam).then((response) => {
      const data = response as BASIC.PlayerDataProps;
      if (data.items) {
        setStats(sortPlayerStats(data.items, sortMethod));
        setTotal(data.total);
      } else if (Array.isArray(data)) {
        // Fallback for old API response
        setStats(sortPlayerStats(data, sortMethod));
        setTotal(data.length);
      }
      console.log("Fetched player stats:", data);
    });
  }, [offset, sortMethod]);

  const handleSortChange = (method: SortMethod): void => {
    setSortMethod(method);
    setOffset(0);
  };

  return (
    <AdminLayout>
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
      </div>
    </AdminLayout>
  );
}
