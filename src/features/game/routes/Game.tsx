import { Link } from "react-router-dom";
import { Keyboard } from "../components/Keyboard";
import { NumberButton } from "../components/NumberButton";
import GamePlayerItemList from "../components/game-player-item/GamePlayerItemList";
import Overlay from "@/components/overlay/Overlay";
import Button from "@/components/button/Button";
import FinishedGamePlayerItemList from "../components/game-player-item/FinishedGamePlayerItemList";
import LinkButton from "@/components/link-button/LinkButton";
import Back from "@/assets/icons/back.svg";
import deleteIcon from "@/assets/icons/delete.svg";
import Undo from "@/assets/icons/undo-copy.svg";
import settingsIcon from "@/assets/icons/settings-inactive.svg";

import styles from "./Game.module.css";
import SettingsOverlay from "../components/SettingsOverlay";
import { useGameLogic } from "../hooks/useGameLogic";

function Game() {
  const {
    gameId,
    gameData,
    isLoading,
    error,
    activePlayers,
    finishedPlayers,
    activePlayer,
    shouldShowFinishOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    isSettingsOpen,
    isSavingSettings,
    settingsError,
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
    handleExitGame,
    refetch,
  } = useGameLogic();

  if (!gameId) {
    return (
      <div className={styles.gamePageHeader}>
        <p>Game identifier is missing. Reopen the room or return to start.</p>
        <Link to="/start">Back to start</Link>
      </div>
    );
  }

  if (isLoading && !gameData) {
    return (
      <div className={styles.gamePageHeader}>
        <p>Loading game…</p>
      </div>
    );
  }

  if (error && !gameData) {
    const message = error instanceof Error ? error.message : "Failed to load game data.";
    return (
      <div className={styles.gamePageHeader}>
        <p>{message}</p>
        <Button label="Retry" handleClick={refetch} type="primary" link="" />
        <Link to="/start">Back to start</Link>
      </div>
    );
  }

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
        initialStartScore={gameData?.settings.startScore ?? 301}
        initialDoubleOut={gameData?.settings.doubleOut ?? false}
        initialTripleOut={gameData?.settings.tripleOut ?? false}
        isSaving={isSavingSettings}
        error={settingsError}
      />

      <div className={styles.gamePage}>
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

        <div className={styles.gameContent}>
          {gameData && (
            <>
              <GamePlayerItemList
                userMap={activePlayers}
                score={activePlayer?.score ?? 0}
                round={gameData.currentRound}
                isBust={activePlayer?.isBust ?? false}
                throwCount={gameData.currentThrowCount}
              />
              <FinishedGamePlayerItemList userMap={finishedPlayers} />
            </>
          )}
        </div>

        <div className={styles.keyboardAndUndo}>
          <NumberButton value="Undo" handleClick={handleUndo} disabled={isUndoDisabled} />
          <Keyboard onThrow={handleThrow} disabled={isInteractionDisabled} />
        </div>
      </div>
    </>
  );
}
export default Game;
