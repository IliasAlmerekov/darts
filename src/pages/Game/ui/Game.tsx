import { Link } from "react-router-dom";
import { Keyboard, NumberButton } from "@/features/game/record-throw";
import GamePlayerItemList from "@/components/game-player-item/GamplayerItemList";
import Overlay from "@/shared/ui/overlay/Overlay";
import Button from "@/shared/ui/button/Button";
import FinishedGamePlayerItemList from "@/components/game-player-item/FinishedGamePlayerItemList";
import LinkButton from "@/components/link-button/LinkButton";
import Back from "@/icons/back.svg";
import deleteIcon from "@/icons/delete.svg";
import Undo from "@/icons/undo-copy.svg";
import settingsIcon from "@/icons/settings-inactive.svg";

import styles from "./Game.module.css";
import SettingsOverlay from "./SettingsOverlay";
import { useGameLogic } from "../model/useGameLogic";

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
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    handleThrow,
    handleUndo,
    handleContinueGame,
    handleUndoFromOverlay,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
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
    return (
      <div className={styles.gamePageHeader}>
        <p>Failed to load game data.</p>
        <Button label="Retry" handleClick={refetch} type="primary" link="" />
        <Link to="/start">Back to start</Link>
      </div>
    );
  }

  return (
    <>
      <Overlay className={styles.overlayBox} isOpen={shouldShowFinishOverlay} src={deleteIcon}>
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

      <div className={styles.gamePageHeader}>
        <Link to="/start" className={styles.top}>
          <img src={Back} alt="Back to Home" />
        </Link>
        <div className={styles.gamePlayerItemContainer}>
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
      </div>

      <div className={styles.keyboardAndUndo}>
        <NumberButton value="Undo" handleClick={handleUndo} disabled={isInteractionDisabled} />
        <Keyboard onThrow={handleThrow} disabled={isInteractionDisabled} />
      </div>

      <LinkButton
        className={styles.settingsBtn}
        label={<img src={settingsIcon} alt="Settings" />}
        handleClick={handleOpenSettings}
      />
    </>
  );
}
export default Game;
