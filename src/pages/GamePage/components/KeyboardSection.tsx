import React from "react";
import { Button } from "@/shared/ui/button";
import { Keyboard } from "./Keyboard";
import { NumberButton } from "./NumberButton";
import styles from "../GamePage.module.css";
import type { SyncStatus } from "../lib/gameSession.logic";
import { getSyncMessage } from "../lib/syncMessage";

interface KeyboardSectionProps {
  onUndo: () => void;
  onThrow: (value: string | number) => void;
  onRetry: () => void;
  isUndoDisabled: boolean;
  isInteractionDisabled: boolean;
  isQueueFull: boolean;
  syncStatus: SyncStatus;
}

export const KeyboardSection = React.memo(function KeyboardSection({
  onUndo,
  onThrow,
  onRetry,
  isUndoDisabled,
  isInteractionDisabled,
  isQueueFull,
  syncStatus,
}: KeyboardSectionProps): React.JSX.Element {
  const syncMessage = getSyncMessage(syncStatus, isQueueFull);

  return (
    <div className={styles.keyboardAndUndo}>
      <NumberButton value="Undo" handleClick={onUndo} disabled={isUndoDisabled} />
      <div role="status" className={styles.syncStatus}>
        {syncMessage !== null ? <p className={styles.syncMessage}>{syncMessage}</p> : null}
        {syncStatus === "offline" || syncStatus === "loadFailed" ? (
          <Button label="Retry" handleClick={onRetry} type="secondary" />
        ) : null}
      </div>
      <Keyboard onThrow={onThrow} disabled={isInteractionDisabled} />
    </div>
  );
});
