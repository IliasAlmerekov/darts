import React from "react";
import Overlay from "@/components/overlay/Overlay";
import Button from "@/components/button/Button";
import deleteIcon from "@/assets/icons/delete.svg";
import styles from "./GuestPlayerOverlay.module.css";

type AddGuestButtonProps = {
  isAddDisabled: boolean;
  isAdding: boolean;
  onAdd: () => void;
};

const AddGuestButton = React.memo(function AddGuestButton({
  isAddDisabled,
  isAdding,
  onAdd,
}: AddGuestButtonProps): React.JSX.Element {
  const handleAddClick = React.useCallback(() => {
    if (isAddDisabled) return;
    onAdd();
  }, [isAddDisabled, onAdd]);

  return (
    <Button
      type="primary"
      label={isAdding ? "Adding..." : "Add"}
      handleClick={handleAddClick}
      disabled={isAddDisabled}
    />
  );
});

type GuestPlayerOverlayProps = {
  isOpen: boolean;
  username: string;
  onUsernameChange: (value: string) => void;
  onAdd: () => void;
  onClose: () => void;
  isAdding?: boolean;
  error?: string | null;
  suggestions?: string[];
  onSuggestionClick?: (value: string) => void;
};

function GuestPlayerOverlay({
  isOpen,
  username,
  onUsernameChange,
  onAdd,
  onClose,
  isAdding = false,
  error = null,
  suggestions = [],
  onSuggestionClick,
}: GuestPlayerOverlayProps): React.JSX.Element {
  const trimmedUsername = username.trim();
  const isAddDisabled = isAdding || trimmedUsername.length === 0;
  const errorId = error ? "guest-username-error" : undefined;
  const hasSuggestions = suggestions.length > 0;

  return (
    <Overlay isOpen={isOpen} onClose={onClose} src={deleteIcon} className={styles.guestOverlayBox}>
      <div className={styles.overlayContent}>
        <h3 className={styles.heading}>Play as a guest</h3>
        <div className={styles.fieldGroup}>
          <label className={styles.label} htmlFor="guest-username">
            Username
          </label>
          <input
            id="guest-username"
            className={styles.input}
            type="text"
            value={username}
            onChange={(event) => onUsernameChange(event.target.value)}
            aria-describedby={errorId}
          />
          {error ? (
            <p className={styles.error} id={errorId} role="alert">
              {error}
            </p>
          ) : null}
          {hasSuggestions ? (
            <div className={styles.suggestions} aria-live="polite">
              <p className={styles.suggestionsLabel}>Try one of these:</p>
              <div className={styles.suggestionsList}>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className={styles.suggestionButton}
                    onClick={() => onSuggestionClick?.(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <div className={styles.actions}>
          <AddGuestButton isAddDisabled={isAddDisabled} isAdding={isAdding} onAdd={onAdd} />
        </div>
      </div>
    </Overlay>
  );
}

export default GuestPlayerOverlay;
