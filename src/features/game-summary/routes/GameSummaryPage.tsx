import OverviewPlayerItemList from "@/components/overview-player-item/OverviewPlayerItemList";
import styles from "./GameSummaryPage.module.css";
import Button from "@/components/button/Button";
import { Podium } from "@/components/podium";
import Undo from "@/assets/icons/undolinkbutton.svg";
import React from "react";
import { useGameSummaryPage } from "../hooks/useGameSummaryPage";
import { useStore } from "@nanostores/react";
import { $gameSettings } from "@/stores";
import { Confetti } from "@/shared/ui/confetti";

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

  const gameSettings = useStore($gameSettings);
  const startScore = gameSettings?.startScore ?? 301;

  return (
    <div className={styles.summary}>
      <Confetti />
      <div className={styles.undoArea}>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            void handleUndo();
          }}
          className={styles.undoButton}
          aria-label="Return to game"
        >
          <img src={Undo} alt="" />
        </button>
      </div>
      <div className={styles.podiumBoard}>
        <Podium userMap={podiumData} list={newList} startScore={startScore} />
      </div>
      <div className={styles.leaderBoard}>
        <OverviewPlayerItemList userMap={leaderBoardList} startScore={startScore} />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.summaryActions}>
        <div className={styles.playAgainWrap}>
          <Button
            label="Play Again"
            type="primary"
            isInverted
            className={styles.summaryActionButton}
            handleClick={handlePlayAgain}
          />
        </div>
        <div className={styles.backToStartWrap}>
          <Button
            label="Back To Start"
            type="primary"
            className={styles.summaryActionButton}
            handleClick={handleBackToStart}
          />
        </div>
      </div>
    </div>
  );
}

export default GameSummaryPage;
