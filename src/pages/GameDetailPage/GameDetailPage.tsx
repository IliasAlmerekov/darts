import React from "react";
import styles from "./GameDetailPage.module.css";
import { Link } from "react-router-dom";
import { ROUTES } from "@/lib/router/routes";
import { Podium } from "@/shared/ui/podium";
import BackBtn from "@/assets/icons/back.svg";
import { OverviewPlayerItemList } from "@/shared/ui/overview-player-item";
import { useGameDetailPage } from "./useGameDetailPage";

export default function GameDetailPage(): React.JSX.Element {
  const { error, podiumData, newList, leaderBoardList } = useGameDetailPage();

  return (
    <div className={styles.gameDetails}>
      <div className={styles.linkBtn}>
        <Link to={ROUTES.gamesOverview} className="back-btn">
          <img src={BackBtn} alt="Back button" />
        </Link>
      </div>
      <div className={styles.podiumCard}>
        <h1>Game details</h1>
        {error ? (
          <div>{error}</div>
        ) : (
          <>
            <Podium userMap={podiumData} list={newList} startScore={301} />
            <div className="playerboard-list">
              <OverviewPlayerItemList userMap={leaderBoardList} startScore={301} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
