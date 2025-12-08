import OverviewPlayerItemList from "@/components/overview-player-item/OverviewPlayerItemList";
import styles from "./GameSummaryPage.module.css";
import Button from "@/components/Button/Button";
import Podium from "@/components/Podium/Podium";
import Undo from "@/icons/undolinkbutton.svg";
import { Link } from "react-router-dom";
import React from "react";
import { useGameSummaryPage } from "../model";

function GameSummaryPage(): React.JSX.Element {
  const {
    error,
    podiumData,
    newList,
    leaderBoardList,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  } = useGameSummaryPage();

  return (
    <div className={styles.summary}>
      <div>
        <Link onClick={handleUndo} to="/game" className={styles.undoButton}>
          <img src={Undo} alt="Undo last action" />
        </Link>
      </div>
      <div className={styles.podiumBoard}>
        <Podium userMap={podiumData} list={newList} />
      </div>
      <div className={styles.leaderBoard}>
        <OverviewPlayerItemList userMap={leaderBoardList} />
      </div>

      <div className={styles.playAgainButton}>
        <Button
          label="Play Again"
          type="primary"
          isInverted
          className={styles.playAgainButton}
          handleClick={handlePlayAgain}
        />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.backToStartButton}>
        <Button label="Back To Start" type="primary" handleClick={handleBackToStart} />
      </div>
    </div>
  );
}

export default GameSummaryPage;
