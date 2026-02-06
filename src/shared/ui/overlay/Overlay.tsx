import styles from "./Overlay.module.css";
import React from "react";

type OverlayProps = {
  isOpen?: boolean;
  onClose?: () => void;
  handleClick?: () => void;
  className?: string;
  backdropClassName?: string;
  src?: string;
  children: React.ReactNode;
  activeOverlay?: "" | "deletePlayer" | "createPlayer" | "Settings";
};

function Overlay({ isOpen, onClose, className, backdropClassName, src, children }: OverlayProps) {
  const containerClass = className || styles.overlayBox;
  const backgroundClass = backdropClassName || styles.overlayBackground;
  const shouldShowCloseButton = Boolean(onClose);

  return (
    <>
      {isOpen ? (
        <div className={backgroundClass}>
          <div className={containerClass}>
            {shouldShowCloseButton ? (
              <button className={styles.delete} onClick={onClose} aria-label="Close overlay">
                <img src={src} alt="Close overlay" />
              </button>
            ) : null}
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
export default Overlay;
