import React from "react";
import styles from "./GameDetailPage.module.css";
import { Link } from "react-router-dom";
import { Podium } from "@/components/podium";
import BackBtn from "@/assets/icons/back.svg";
import { AdminLayout } from "@/components/admin-layout";
import OverviewPlayerItemList from "@/components/overview-player-item/OverviewPlayerItemList";
import { useGameDetailPage } from "../hooks/useGameDetailPage";

export default function GameDetailPage(): React.JSX.Element {
  const { error, podiumData, newList, leaderBoardList } = useGameDetailPage();

  return (
    <AdminLayout>
      <div className={styles.gameDetails}>
        <div className={styles.linkBtn}>
          <Link to="/gamesoverview" className="back-btn">
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
    </AdminLayout>
  );
}
