import { useEffect, useId, useState } from "react";
import { Overlay } from "@/shared/ui/overlay";
import { SettingsGroupBtn, Button } from "@/shared/ui/button";
import type { GameMode } from "@/types";
import styles from "./SettingsOverlay.module.css";
import deleteIcon from "@/assets/icons/delete.svg";

type SettingsOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { doubleOut: boolean; tripleOut: boolean }) => void;
  initialStartScore: number;
  initialDoubleOut: boolean;
  initialTripleOut: boolean;
  isSaving?: boolean;
  error?: string | null;
};

const GAME_MODE_OPTIONS = [
  { label: "Single-out", id: "single-out" },
  { label: "Double-out", id: "double-out" },
  { label: "Triple-out", id: "triple-out" },
] as const satisfies ReadonlyArray<{ label: string; id: GameMode }>;

function resolveGameMode(doubleOut: boolean, tripleOut: boolean): GameMode {
  if (doubleOut) return "double-out";
  if (tripleOut) return "triple-out";
  return "single-out";
}

function isGameMode(id: string | number): id is GameMode {
  return GAME_MODE_OPTIONS.some((option) => option.id === id);
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
}: SettingsOverlayProps) {
  const titleId = useId();
  const [gameMode, setGameMode] = useState<GameMode>(
    resolveGameMode(initialDoubleOut, initialTripleOut),
  );

  useEffect(() => {
    setGameMode(resolveGameMode(initialDoubleOut, initialTripleOut));
  }, [initialDoubleOut, initialTripleOut, initialStartScore]);

  const handleSave = () => {
    const doubleOut = gameMode === "double-out";
    const tripleOut = gameMode === "triple-out";
    onSave({ doubleOut, tripleOut });
  };

  return (
    <Overlay
      className={`${styles.overlayBox} ${styles.centeredOverlayBox}`}
      backdropClassName={styles.settingsOverlayBackground}
      isOpen={isOpen}
      src={deleteIcon}
      onClose={onClose}
      ariaLabelledBy={titleId}
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
          className={styles.settingsOverlayBtn}
          type="primary"
          label={isSaving ? "Saving..." : "Save"}
          handleClick={handleSave}
          link={""}
          disabled={isSaving}
        />
        {error ? <p className={styles.errorText}>{error}</p> : null}
      </div>
    </Overlay>
  );
}

export default SettingsOverlay;
