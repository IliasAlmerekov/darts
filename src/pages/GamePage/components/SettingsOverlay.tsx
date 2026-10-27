import React, { useId, useState } from "react";
import clsx from "clsx";
import { Overlay } from "@/shared/ui/overlay";
import { SettingsGroupBtn, Button } from "@/shared/ui/button";
import {
  GAME_MODE_OPTIONS,
  isGameMode,
  resolveGameMode,
  toGameModeFlags,
} from "@/lib/game/gameMode";
import type { GameMode } from "@/types";
import styles from "./SettingsOverlay.module.css";
import deleteIcon from "@/assets/icons/delete.svg";

interface SettingsOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { doubleOut: boolean; tripleOut: boolean }) => void;
  initialStartScore: number;
  initialDoubleOut: boolean;
  initialTripleOut: boolean;
  isSaving?: boolean;
  error?: string | null;
}

function SettingsOverlay({
  isOpen,
  onClose,
  onSave,
  initialStartScore,
  initialDoubleOut,
  initialTripleOut,
  isSaving = false,
  error = null,
}: SettingsOverlayProps): React.JSX.Element {
  const titleId = useId();
  const initialGameMode = resolveGameMode(initialDoubleOut, initialTripleOut);
  const [gameMode, setGameMode] = useState<GameMode>(initialGameMode);
  const [prevInitialProps, setPrevInitialProps] = useState({
    initialDoubleOut,
    initialTripleOut,
    initialStartScore,
  });
  const overlayProps = {
    ...(styles.settingsOverlayBackground !== undefined
      ? { backdropClassName: styles.settingsOverlayBackground }
      : {}),
  };
  const saveButtonProps = {
    ...(styles.settingsOverlayBtn !== undefined ? { className: styles.settingsOverlayBtn } : {}),
  };

  // New initial settings replace the picked mode; any other re-render keeps it.
  if (
    prevInitialProps.initialDoubleOut !== initialDoubleOut ||
    prevInitialProps.initialTripleOut !== initialTripleOut ||
    prevInitialProps.initialStartScore !== initialStartScore
  ) {
    setPrevInitialProps({ initialDoubleOut, initialTripleOut, initialStartScore });
    setGameMode(initialGameMode);
  }

  const handleSave = (): void => {
    onSave(toGameModeFlags(gameMode));
  };

  return (
    <Overlay
      className={clsx(styles.overlayBox, styles.centeredOverlayBox)}
      isOpen={isOpen}
      src={deleteIcon}
      onClose={onClose}
      ariaLabelledBy={titleId}
      {...overlayProps}
    >
      <div className={styles.settingsOverlay}>
        <h3 className={styles.overlayHeadline} id={titleId}>
          Settings
        </h3>
        <div className={styles.settingsBodyContainer}>
          <SettingsGroupBtn
            title="Game Mode"
            options={GAME_MODE_OPTIONS}
            selectedId={gameMode}
            onClick={(id) => {
              if (isGameMode(id)) {
                setGameMode(id);
              }
            }}
          />
        </div>
        <Button
          type="primary"
          label={isSaving ? "Saving..." : "Save"}
          handleClick={handleSave}
          link={""}
          disabled={isSaving}
          {...saveButtonProps}
        />
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </Overlay>
  );
}

export default SettingsOverlay;
