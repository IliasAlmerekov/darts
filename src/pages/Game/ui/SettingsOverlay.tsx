import { useEffect, useState } from "react";
import Overlay from "@/shared/ui/overlay/Overlay";
import SettingsGroupBtn from "@/shared/ui/button/SettingsGroupBtn";
import Button from "@/shared/ui/button/Button";
import styles from "./Game.module.css";
import deleteIcon from "@/icons/delete.svg";

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
  const [gameMode, setGameMode] = useState<"single-out" | "double-out" | "triple-out">(
    initialDoubleOut ? "double-out" : initialTripleOut ? "triple-out" : "single-out",
  );

  useEffect(() => {
    setGameMode(initialDoubleOut ? "double-out" : initialTripleOut ? "triple-out" : "single-out");
  }, [initialDoubleOut, initialTripleOut, initialStartScore]);

  const handleSave = () => {
    const doubleOut = gameMode === "double-out";
    const tripleOut = gameMode === "triple-out";
    onSave({ doubleOut, tripleOut });
  };

  return (
    <Overlay className={styles.overlayBox} isOpen={isOpen} src={deleteIcon} onClose={onClose}>
      <div className={styles.settingsOverlay}>
        <h3 className={styles.overlayHeadline}>Settings</h3>
        <div className={styles.settingsBodyContainer}>
          <SettingsGroupBtn
            title="Game Mode"
            options={[
              { label: "Single-out", id: "single-out" },
              { label: "Double-out", id: "double-out" },
              { label: "Triple-out", id: "triple-out" },
            ]}
            selectedId={gameMode}
            onClick={(id) => setGameMode(id as typeof gameMode)}
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
