import "./Overlay.css";
import React from "react";

type OverlayProps = {
  isOpen?: boolean;
  onClose?: () => void;
  handleClick?: () => void;
  className?: string;
  src?: string;
  children: React.ReactNode;
  activeOverlay?: "" | "deletePlayer" | "createPlayer" | "Settings";
};

function Overlay({ isOpen, onClose, className, src, children }: OverlayProps) {
  return (
    <>
      {isOpen ? (
        <div className="overlay-background">
          <div className={className}>
            <button className="delete" onClick={onClose} aria-label="Close overlay">
              <img src={src} alt="Close overlay" />
            </button>
            {children}
          </div>
        </div>
      ) : null}
    </>
  );
}
export default Overlay;
