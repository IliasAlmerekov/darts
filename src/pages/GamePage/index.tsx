import React from "react";
import { ErrorState } from "@/shared/ui/error-state";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { DEFAULT_START_SCORE } from "@/lib/game/gameMode";
import GamePlayerItemList from "./components/game-player-item/GamePlayerItemList";
import FinishedGamePlayerItemList from "./components/game-player-item/FinishedGamePlayerItemList";
// shortcut: HeaderSection stays the first section import so LinkButton's CSS loads before
// GamePage.module.css overrides it; drop the ordering once .settingsBtn and .undoThrow win on specificity.
import { HeaderSection } from "./components/HeaderSection";
import { KeyboardSection } from "./components/KeyboardSection";
import { OverlaysSection } from "./components/OverlaysSection";
import styles from "./GamePage.module.css";
import { useGameLogic } from "./useGameLogic";

function GamePage(): React.JSX.Element {
  const {
    gameId,
    gameData,
    error,
    activePlayers,
    finishedPlayers,
    shouldShowFinishOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    isSettingsDisabled,
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    pageError,
    isExitOverlayOpen,
    isExitPending,
    isQueueFull,
    syncStatus,
    handleRetry,
    handleThrow,
    handleUndo,
    handleContinueGame,
    handleUndoFromOverlay,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    handleOpenExitOverlay,
    handleCloseExitOverlay,
    clearPageError,
    handleExitGame,
  } = useGameLogic();

  if (gameId === null) {
    return (
      <div className={styles.gamePageHeader}>
        <ErrorState
          variant="page"
          title="Game not available"
          message="Game identifier is missing. Reopen the room or return to start."
          primaryAction={{ label: "Back to start", to: ROUTES.start() }}
        />
      </div>
    );
  }

  if (error && !gameData) {
    const message = toUserErrorMessage(error, "Could not load game data.");
    return (
      <div className={styles.gamePageHeader}>
        <ErrorState
          variant="page"
          title="Could not load game"
          message={message}
          primaryAction={{ label: "Retry", onClick: handleRetry }}
          secondaryAction={{ label: "Back to start", to: ROUTES.start() }}
        />
      </div>
    );
  }

  return (
    <>
      <OverlaysSection
        shouldShowFinishOverlay={shouldShowFinishOverlay}
        isExitOverlayOpen={isExitOverlayOpen}
        isExitPending={isExitPending}
        isSettingsOpen={isSettingsOpen}
        settingsError={settingsError}
        isSavingSettings={isSavingSettings}
        initialStartScore={gameData?.settings.startScore ?? DEFAULT_START_SCORE}
        initialDoubleOut={gameData?.settings.doubleOut ?? false}
        initialTripleOut={gameData?.settings.tripleOut ?? false}
        handleContinueGame={handleContinueGame}
        handleUndoFromOverlay={handleUndoFromOverlay}
        handleCloseExitOverlay={handleCloseExitOverlay}
        handleExitGame={handleExitGame}
        handleCloseSettings={handleCloseSettings}
        handleSaveSettings={handleSaveSettings}
      />

      <div className={styles.gamePage}>
        {pageError ? (
          <div className={styles.pageError}>
            <ErrorState
              title="Game action failed"
              message={pageError}
              primaryAction={{ label: "Dismiss", onClick: clearPageError }}
            />
          </div>
        ) : null}
        <HeaderSection
          handleOpenExitOverlay={handleOpenExitOverlay}
          handleOpenSettings={handleOpenSettings}
          isSettingsDisabled={isSettingsDisabled}
        />

        <div className={styles.gameContent}>
          {gameData && (
            <>
              <GamePlayerItemList userMap={activePlayers} round={gameData.currentRound} />
              <FinishedGamePlayerItemList userMap={finishedPlayers} />
            </>
          )}
        </div>

        <KeyboardSection
          onUndo={handleUndo}
          onThrow={handleThrow}
          onRetry={handleRetry}
          isUndoDisabled={isUndoDisabled}
          isInteractionDisabled={isInteractionDisabled}
          isQueueFull={isQueueFull}
          syncStatus={syncStatus}
        />
      </div>
    </>
  );
}

export default GamePage;
