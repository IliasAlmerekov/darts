import "../Overlay/Overlay.css";
import React from "react";

type Props = {
    isOpen?: boolean
    onClose?: () => void
    handleClick?: () => void
    className?: string
    src?: string;
    children: React.ReactNode;
    activeOverlay?: "" | "deletePlayer" | "createPlayer" | "Settings"
}

function Overlay({ ...props }: Props) {
  return (
    <>
      {props.isOpen ? (
        <div className="overlayBackground">
          <div className={props.className}>
            <div className="delete" onClick={props.onClose}>
              <img src={props.src} alt="Close overlay" />
            </div>
            {props.children}
          </div>
        </div>
      ) : null}
    </>
  );
}
export default Overlay;
