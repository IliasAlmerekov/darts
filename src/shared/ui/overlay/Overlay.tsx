import React from "react";
import { Dialog } from "@/shared/ui/dialog";
import styles from "./Overlay.module.css";

type OverlayProps = {
  isOpen?: boolean;
  onClose?: () => void;
  handleClick?: () => void;
  className?: string;
  backdropClassName?: string;
  src?: string;
  children: React.ReactNode;
  activeOverlay?: "" | "deletePlayer" | "createPlayer" | "Settings";
  ariaLabel?: string;
  ariaLabelledBy?: string;
};

function Overlay({
  isOpen,
  onClose,
  className,
  backdropClassName,
  src,
  children,
  ariaLabel,
  ariaLabelledBy,
}: OverlayProps) {
  const containerClass = className ?? styles.overlayBox ?? "";
  const backgroundClass = backdropClassName ?? styles.overlayBackground ?? "";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      className={containerClass}
      backdropClassName={backgroundClass}
      closeIconSrc={src}
      ariaLabel={ariaLabel}
      ariaLabelledBy={ariaLabelledBy}
    >
      {children}
    </Dialog>
  );
}
export default Overlay;
