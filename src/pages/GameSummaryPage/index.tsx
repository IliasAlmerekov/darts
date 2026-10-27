import { OverviewPlayerItemList } from "@/shared/ui/overview-player-item";
import styles from "./GameSummaryPage.module.css";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import { Podium } from "@/shared/ui/podium";
import Undo from "@/assets/icons/undolinkbutton.svg";
import React from "react";
import { useGameSummaryPage } from "./useGameSummaryPage";

function GameSummaryPage(): React.JSX.Element {
  const {
    error,
    leaving,
    isActionPending,
    podiumData,
    standings,
    leaderBoardList,
    loadSummary,
    handleUndo,
    handlePlayAgain,
    handleBackToStart,
  } = useGameSummaryPage();

  const summaryActionButtonClassName = styles.summaryActionButton;
  const summaryActionButtonProps =
    typeof summaryActionButtonClassName === "string"
      ? { className: summaryActionButtonClassName }
      : {};

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
          disabled={isActionPending}
          aria-label="Return to game"
        >
          <img src={Undo} alt="" />
        </button>
      </div>
      <div className={styles.podiumBoard}>
        <Podium userMap={podiumData} list={standings} />
      </div>
      <div className={styles.leaderBoard}>
        <OverviewPlayerItemList userMap={leaderBoardList} />
      </div>

      {error ? (
        <div className={styles.errorPanel}>
          <ErrorState
            title="Summary action failed"
            message={error}
            {...(leaving
              ? {}
              : { primaryAction: { label: "Retry", onClick: () => void loadSummary() } })}
          />
        </div>
      ) : null}

      <div className={styles.summaryActions}>
        <div className={styles.playAgainWrap}>
          <Button
            label="Play Again"
            type="primary"
            isInverted
            disabled={isActionPending}
            handleClick={handlePlayAgain}
            {...summaryActionButtonProps}
          />
        </div>
        <div className={styles.backToStartWrap}>
          <Button
            label="Back To Start"
            type="primary"
            disabled={isActionPending}
            handleClick={handleBackToStart}
            {...summaryActionButtonProps}
          />
        </div>
      </div>
    </div>
  );
}

export default GameSummaryPage;
