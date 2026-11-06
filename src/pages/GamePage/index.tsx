import React, { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorState } from "@/shared/ui/error-state";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { DEFAULT_START_SCORE, resolveGameMode } from "@/lib/game/gameMode";
import GamePlayerItemList from "./scoreboard/GamePlayerItemList";
import FinishedGamePlayerItemList from "./scoreboard/FinishedGamePlayerItemList";
// shortcut: HeaderSection stays the first section import so LinkButton's CSS loads before
// GamePage.module.css overrides it; drop the ordering once .settingsBtn wins on specificity.
import { HeaderSection } from "./components/HeaderSection";
import { KeyboardSection } from "./keyboard/KeyboardSection";
import { OverlaysSection } from "./overlays/OverlaysSection";
import styles from "./GamePage.module.css";
import { useGameSession } from "./useGameSession";
import { useGameSounds } from "./lib/useGameSounds";
import { useWakeLock } from "./lib/useWakeLock";
import { useGameExitFlow, useGameSettingsFlow } from "./overlays/useGameActions";
import { useGameSummaryNavigation, useInteractionSoundUnlock } from "./lib/useGamePageEffects";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";

function GamePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const gameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);
  const { view, commands } = useGameSession(gameId);
  useGameSounds(view.game);
  useWakeLock(view.game?.status === "started");
  useInteractionSoundUnlock();
  const [pageError, setPageError] = useState<string | null>(null);
  const {
    handleCloseSettings,
    handleOpenSettings,
    handleSaveSettings,
    isSavingSettings,
    isSettingsOpen,
    settingsError,
  } = useGameSettingsFlow({
    gameData: view.game,
    gameId,
    updateGameSettings: commands.updateSettings,
  });
  const {
    handleCloseExitOverlay,
    handleExitGame,
    handleOpenExitOverlay,
    isExitOverlayOpen,
    isExitPending,
  } = useGameExitFlow({ gameId, navigate, setPageError });
  useGameSummaryNavigation({ gameId, isFinished: view.isFinished, navigate });
  const clearPageError = useCallback(() => setPageError(null), []);

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

  if (view.error && !view.game) {
    const message = toUserErrorMessage(view.error, "Could not load game data.");
    return (
      <div className={styles.gamePageHeader}>
        <ErrorState
          variant="page"
          title="Could not load game"
          message={message}
          primaryAction={{ label: "Retry", onClick: commands.retry }}
          secondaryAction={{ label: "Back to start", to: ROUTES.start() }}
        />
      </div>
    );
  }

  return (
    <>
      <OverlaysSection
        shouldShowFinishOverlay={view.shouldShowFinishOverlay}
        isFinishGameDisabled={!view.canFinishGame || view.isFinishPending}
        isFinishPending={view.isFinishPending}
        finishError={view.finishError}
        isExitOverlayOpen={isExitOverlayOpen}
        isExitPending={isExitPending}
        isSettingsOpen={isSettingsOpen}
        settingsError={settingsError}
        isSavingSettings={isSavingSettings}
        initialStartScore={view.game?.settings.startScore ?? DEFAULT_START_SCORE}
        initialDoubleOut={view.game?.settings.doubleOut ?? false}
        initialTripleOut={view.game?.settings.tripleOut ?? false}
        handleContinueGame={commands.continueGame}
        handleUndoFromOverlay={commands.undoFromOverlay}
        handleFinishGame={commands.finishGame}
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
          isSettingsDisabled={view.isSettingsDisabled}
        />

        <div className={styles.gameContent}>
          {view.game && (
            <>
              <GamePlayerItemList
                userMap={view.activePlayers}
                round={view.game.currentRound}
                mode={resolveGameMode(view.game.settings.doubleOut, view.game.settings.tripleOut)}
                gameFinished={view.game.status === "finished"}
              />
              <FinishedGamePlayerItemList userMap={view.finishedPlayers} />
            </>
          )}
        </div>

        <KeyboardSection
          onUndo={commands.undo}
          onThrow={commands.throwDart}
          onRetry={commands.retry}
          isUndoDisabled={view.isUndoDisabled}
          isInteractionDisabled={view.isInteractionDisabled}
          isQueueFull={view.isQueueFull}
          syncStatus={view.status}
        />
      </div>
    </>
  );
}

export default GamePage;
