import React from "react";
import styles from "./GameDetailPage.module.css";
import { ROUTES } from "@/lib/router/routes";
import { Podium } from "@/shared/ui/podium";
import { OverviewPlayerItemList } from "@/shared/ui/overview-player-item";
import { BackButton } from "@/shared/ui/back-button";
import { useGameDetailPage } from "./useGameDetailPage";

export default function GameDetailPage(): React.JSX.Element {
  const { podiumData, newList, leaderBoardList } = useGameDetailPage();

  return (
    <div className={styles.gameDetails}>
      <div className={styles.linkBtn}>
        <BackButton to={ROUTES.gamesOverview} />
      </div>
      <div className={styles.podiumCard}>
        <h1>Game details</h1>
        <Podium userMap={podiumData} list={newList} />
        <div className={styles.playerboardList}>
          <OverviewPlayerItemList userMap={leaderBoardList} />
        </div>
      </div>
    </div>
  );
}
