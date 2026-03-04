import React from "react";
import { Keyboard } from "../components/Keyboard";
import { NumberButton } from "../components/NumberButton";
import GamePlayerItemList from "../components/game-player-item/GamePlayerItemList";
import Overlay from "@/components/overlay/Overlay";
import Button from "@/components/button/Button";
import { ErrorState } from "@/components/error-state";
import FinishedGamePlayerItemList from "../components/game-player-item/FinishedGamePlayerItemList";
import LinkButton from "@/components/link-button/LinkButton";
import Back from "@/assets/icons/back.svg";
import deleteIcon from "@/assets/icons/delete.svg";
import Undo from "@/assets/icons/undo-copy.svg";
import settingsIcon from "@/assets/icons/settings-inactive.svg";
import { toUserErrorMessage } from "@/lib/error-to-user-message";

import styles from "./Game.module.css";
import SettingsOverlay from "../components/SettingsOverlay";
import { useGameLogic } from "../hooks/useGameLogic";

type OverlaysSectionProps = {
  shouldShowFinishOverlay: boolean;
  isExitOverlayOpen: boolean;
  isSettingsOpen: boolean;
  isSavingSettings: boolean;
  settingsError: string | null;
  initialStartScore: number;
  initialDoubleOut: boolean;
  initialTripleOut: boolean;
  handleContinueGame: () => void;
  handleUndoFromOverlay: () => Promise<void>;
  handleCloseExitOverlay: () => void;
  handleExitGame: () => Promise<void>;
  handleCloseSettings: () => void;
  handleSaveSettings: (settings: { doubleOut: boolean; tripleOut: boolean }) => Promise<void>;
};

const OverlaysSection = React.memo(function OverlaysSection({
  shouldShowFinishOverlay,
  isExitOverlayOpen,
  isSettingsOpen,
  isSavingSettings,
  settingsError,
  initialStartScore,
  initialDoubleOut,
  initialTripleOut,
  handleContinueGame,
  handleUndoFromOverlay,
  handleCloseExitOverlay,
  handleExitGame,
  handleCloseSettings,
  handleSaveSettings,
}: OverlaysSectionProps): JSX.Element {
  return (
    <>
      <Overlay
        className={`${styles.overlayBox} ${styles.centeredOverlayBox}`}
        backdropClassName={styles.centeredOverlayBackground}
        isOpen={shouldShowFinishOverlay}
        src={deleteIcon}
      >
        <div className={styles.finishGameOverlay}>
          <p className={styles.overlayHeading}>Player Finished! Continue Game?</p>
          <div>
            <Button label="Continue" handleClick={handleContinueGame} type="primary" link="" />
            <LinkButton
              icon={Undo}
              label="Undo Throw"
              handleClick={handleUndoFromOverlay}
              className={styles.undoThrow}
            />
          </div>
        </div>
      </Overlay>

      <Overlay
        className={styles.overlayBox}
        isOpen={isExitOverlayOpen}
        onClose={handleCloseExitOverlay}
        src={deleteIcon}
      >
        <div className={styles.finishGameOverlay}>
          <p className={styles.overlayHeading}>End Game?</p>
          <p>A new game with the same players will be created.</p>
          <div>
            <Button label="Yes" handleClick={handleExitGame} type="primary" link="" />
            <Button label="Cancel" handleClick={handleCloseExitOverlay} type="secondary" link="" />
          </div>
        </div>
      </Overlay>

      <SettingsOverlay
        isOpen={isSettingsOpen}
        onClose={handleCloseSettings}
        onSave={handleSaveSettings}
        initialStartScore={initialStartScore}
        initialDoubleOut={initialDoubleOut}
        initialTripleOut={initialTripleOut}
        isSaving={isSavingSettings}
        error={settingsError}
      />
    </>
  );
});

type HeaderSectionProps = {
  handleOpenExitOverlay: () => void;
  handleOpenSettings: () => void;
};

const HeaderSection = React.memo(function HeaderSection({
  handleOpenExitOverlay,
  handleOpenSettings,
}: HeaderSectionProps): JSX.Element {
  return (
    <header className={styles.gameHeader}>
      <button onClick={handleOpenExitOverlay} className={styles.top}>
        <img src={Back} alt="Back to Home" />
      </button>
      <LinkButton
        className={styles.settingsBtn}
        label={<img src={settingsIcon} alt="Settings" />}
        handleClick={handleOpenSettings}
      />
    </header>
  );
});

type KeyboardSectionProps = {
  onUndo: () => Promise<void>;
  onThrow: (value: string | number) => Promise<void>;
  isUndoDisabled: boolean;
  isInteractionDisabled: boolean;
};

const KeyboardSection = React.memo(function KeyboardSection({
  onUndo,
  onThrow,
  isUndoDisabled,
  isInteractionDisabled,
}: KeyboardSectionProps): JSX.Element {
  return (
    <div className={styles.keyboardAndUndo}>
      <NumberButton value="Undo" handleClick={onUndo} disabled={isUndoDisabled} />
      <Keyboard onThrow={onThrow} disabled={isInteractionDisabled} />
    </div>
  );
});

function Game() {
  const {
    gameId,
    gameData,
    error,
    activePlayers,
    finishedPlayers,
    shouldShowFinishOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    pageError,
    isExitOverlayOpen,
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
    refetch,
  } = useGameLogic();

  if (!gameId) {
    return (
      <div className={styles.gamePageHeader}>
        <ErrorState
          variant="page"
          title="Game not available"
          message="Game identifier is missing. Reopen the room or return to start."
          primaryAction={{ label: "Back to start", to: "/start" }}
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
          primaryAction={{ label: "Retry", onClick: () => void refetch() }}
          secondaryAction={{ label: "Back to start", to: "/start" }}
        />
      </div>
    );
  }

  return (
    <>
      <OverlaysSection
        shouldShowFinishOverlay={shouldShowFinishOverlay}
        isExitOverlayOpen={isExitOverlayOpen}
        isSettingsOpen={isSettingsOpen}
        settingsError={settingsError}
        isSavingSettings={isSavingSettings}
        initialStartScore={gameData?.settings.startScore ?? 301}
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
          isUndoDisabled={isUndoDisabled}
          isInteractionDisabled={isInteractionDisabled}
        />
      </div>
    </>
  );
}
export default Game;
