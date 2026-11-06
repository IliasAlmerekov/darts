import React from "react";
import clsx from "clsx";
import { Overlay } from "@/shared/ui/overlay";
import { Button } from "@/shared/ui/button";
import deleteIcon from "@/assets/icons/delete.svg";
import Undo from "@/assets/icons/undo-dark.svg";
import styles from "../GamePage.module.css";
import SettingsOverlay from "./SettingsOverlay";

interface OverlaysSectionProps {
  shouldShowFinishOverlay: boolean;
  isFinishGameDisabled: boolean;
  isFinishPending: boolean;
  finishError: string | null;
  isExitOverlayOpen: boolean;
  isExitPending: boolean;
  isSettingsOpen: boolean;
  isSavingSettings: boolean;
  settingsError: string | null;
  initialStartScore: number;
  initialDoubleOut: boolean;
  initialTripleOut: boolean;
  handleContinueGame: () => void;
  handleUndoFromOverlay: () => void;
  handleFinishGame: () => void;
  handleCloseExitOverlay: () => void;
  handleExitGame: () => Promise<void>;
  handleCloseSettings: () => void;
  handleSaveSettings: (settings: { doubleOut: boolean; tripleOut: boolean }) => Promise<void>;
}

export const OverlaysSection = React.memo(function OverlaysSection({
  shouldShowFinishOverlay,
  isFinishGameDisabled,
  isFinishPending,
  finishError,
  isExitOverlayOpen,
  isExitPending,
  isSettingsOpen,
  isSavingSettings,
  settingsError,
  initialStartScore,
  initialDoubleOut,
  initialTripleOut,
  handleContinueGame,
  handleUndoFromOverlay,
  handleFinishGame,
  handleCloseExitOverlay,
  handleExitGame,
  handleCloseSettings,
  handleSaveSettings,
}: OverlaysSectionProps): React.JSX.Element {
  const finishOverlayTitleId = React.useId();
  const exitOverlayTitleId = React.useId();
  const finishOverlayProps = {
    ...(styles.centeredOverlayBackground !== undefined
      ? { backdropClassName: styles.centeredOverlayBackground }
      : {}),
  };
  const exitOverlayProps = {
    ...(styles.overlayBox !== undefined ? { className: styles.overlayBox } : {}),
  };

  return (
    <>
      <Overlay
        className={clsx(styles.overlayBox, styles.centeredOverlayBox, styles.finishOverlayCard)}
        isOpen={shouldShowFinishOverlay}
        ariaLabelledBy={finishOverlayTitleId}
        {...finishOverlayProps}
      >
        <div className={styles.finishOverlayContent}>
          <h2 className={styles.finishOverlayHeading} id={finishOverlayTitleId}>
            Player Finished!
          </h2>
          <p className={styles.finishOverlaySubtitle}>
            Continue the game with the remaining players?
          </p>
          {finishError ? (
            <p className={styles.finishOverlayError} role="alert">
              {finishError}
            </p>
          ) : null}
          <div className={styles.finishOverlayActions}>
            <button
              type="button"
              className={clsx(styles.finishOverlayButton, styles.finishOverlayContinue)}
              onClick={handleContinueGame}
              disabled={isFinishPending}
            >
              Continue game
            </button>
            <button
              type="button"
              className={clsx(styles.finishOverlayButton, styles.finishOverlayFinish)}
              onClick={handleFinishGame}
              disabled={isFinishGameDisabled}
            >
              Finish game
            </button>
            <button
              type="button"
              className={clsx(styles.finishOverlayButton, styles.finishOverlayUndo)}
              onClick={handleUndoFromOverlay}
              disabled={isFinishPending}
            >
              <img src={Undo} alt="" aria-hidden="true" />
              Undo last throw
            </button>
          </div>
        </div>
      </Overlay>

      <Overlay
        isOpen={isExitOverlayOpen}
        onClose={handleCloseExitOverlay}
        src={deleteIcon}
        ariaLabelledBy={exitOverlayTitleId}
        {...exitOverlayProps}
      >
        <div className={styles.finishGameOverlay}>
          <p className={styles.overlayHeading} id={exitOverlayTitleId}>
            End Game?
          </p>
          <p>A new game with the same players will be created.</p>
          <div>
            <Button
              label="Yes"
              handleClick={handleExitGame}
              type="primary"
              link=""
              disabled={isExitPending}
            />
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
