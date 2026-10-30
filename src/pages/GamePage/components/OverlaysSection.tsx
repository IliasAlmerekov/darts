import React from "react";
import clsx from "clsx";
import { Overlay } from "@/shared/ui/overlay";
import { Button } from "@/shared/ui/button";
import { LinkButton } from "@/shared/ui/link-button";
import deleteIcon from "@/assets/icons/delete.svg";
import Undo from "@/assets/icons/undo-copy.svg";
import styles from "../Game.module.css";
import SettingsOverlay from "./SettingsOverlay";

interface OverlaysSectionProps {
  shouldShowFinishOverlay: boolean;
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
  handleCloseExitOverlay: () => void;
  handleExitGame: () => Promise<void>;
  handleCloseSettings: () => void;
  handleSaveSettings: (settings: { doubleOut: boolean; tripleOut: boolean }) => Promise<void>;
}

export const OverlaysSection = React.memo(function OverlaysSection({
  shouldShowFinishOverlay,
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
        className={clsx(styles.overlayBox, styles.centeredOverlayBox)}
        isOpen={shouldShowFinishOverlay}
        src={deleteIcon}
        ariaLabelledBy={finishOverlayTitleId}
        {...finishOverlayProps}
      >
        <div className={styles.finishGameOverlay}>
          <p className={styles.overlayHeading} id={finishOverlayTitleId}>
            Player Finished! Continue Game?
          </p>
          <div>
            <Button label="Continue" handleClick={handleContinueGame} type="primary" link="" />
            <LinkButton
              icon={Undo}
              label="Undo Throw"
              handleClick={handleUndoFromOverlay}
              {...(styles.undoThrow !== undefined ? { className: styles.undoThrow } : {})}
            />
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
