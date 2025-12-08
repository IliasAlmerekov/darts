import React from "react";
import styles from "./GameDetailPage.module.css";
import { Link, useParams } from "react-router-dom";
import { Podium } from "@/widgets/podium";
import BackBtn from "@/icons/back.svg";
import NavigationBar from "@/widgets/navigation-bar/NavigationBar";
import OverviewPlayerItemList from "@/components/overview-player-item/OverviewPlayerItemList";

export default function GameDetailPage(): React.JSX.Element {
  const { id } = useParams();
  const savedGames = JSON.parse(localStorage.getItem("FinishedGames") || "[]");
  const game = savedGames.find((g: { id: string | undefined }) => g.id === id);

  if (!game) return <div>Game not found</div>;

  const podiumList = game.players.slice(0, 3);
  const podiumListWithPlaceholder = [...podiumList];
  const leaderBoardList = game.players.slice(3, game.players.length + 1);

  if (podiumList.length === 2) {
    podiumListWithPlaceholder.push({
      id: 0,
      name: "-",
      totalScore: 0,
      roundCount: 0,
      scoreAverage: 0,
      rounds: [],
    });
  }
  const podiumData = podiumList.length === 2 ? podiumListWithPlaceholder : podiumList;
  return (
    <div className={styles.gameDetails}>
      <NavigationBar />
      <div className={styles.linkBtn}>
        <Link to="/gamesoverview" className="back-btn">
          <img src={BackBtn} alt="Back button" />
        </Link>
      </div>
      <div className={styles.podiumCard}>
        <div className={styles.dateInfo}>
          <h1>
            {new Date(game.date).toLocaleDateString("de-De", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
          </h1>
          <h3>
            {new Date(game.date).toLocaleTimeString("de-DE", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })}{" "}
            Uhr
          </h3>
        </div>
        <Podium userMap={podiumData} list={game.players} />
        <div className="playerboard-list">
          <OverviewPlayerItemList userMap={leaderBoardList} />
        </div>
      </div>
    </div>
  );
}
