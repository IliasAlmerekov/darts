import { OverviewPlayerItemList } from "@/shared/ui/overview-player-item";
import styles from "./GameSummaryPage.module.css";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { Podium } from "@/shared/ui/podium";
import Undo from "@/assets/icons/undolinkbutton.svg";
import React from "react";
import { useGameSummaryPage } from "./useGameSummaryPage";
import { useStore } from "@nanostores/react";
import { $gameSettings } from "@/shared/store";

function GameSummaryPage(): React.JSX.Element {
  const {
    error,
    starting,
    podiumData,
    newList,
    leaderBoardList,
    loadSummary,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  } = useGameSummaryPage();

  const gameSettings = useStore($gameSettings);
  const startScore = gameSettings?.startScore ?? 301;
  const summaryActionButtonProps = {
    ...(styles.summaryActionButton !== undefined ? { className: styles.summaryActionButton } : {}),
  };

  return (
    <div className={styles.summary}>
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

      {error ? (
        <div className={styles.errorPanel}>
          <ErrorState
            title="Summary action failed"
            message={error}
            primaryAction={{ label: "Retry", onClick: () => void loadSummary() }}
          />
        </div>
      ) : null}

      <div className={styles.summaryActions}>
        <div className={styles.playAgainWrap}>
          <Button
            label="Play Again"
            type="primary"
            isInverted
            disabled={starting}
            handleClick={handlePlayAgain}
            {...summaryActionButtonProps}
          />
        </div>
        <div className={styles.backToStartWrap}>
          <Button
            label="Back To Start"
            type="primary"
            handleClick={handleBackToStart}
            {...summaryActionButtonProps}
          />
        </div>
      </div>
    </div>
  );
}

export default GameSummaryPage;
