import React from "react";
import { Dialog } from "@/shared/ui/dialog";
import styles from "./Overlay.module.css";

interface OverlayProps {
  isOpen?: boolean | undefined;
  onClose?: (() => void) | undefined;
  className?: string | undefined;
  backdropClassName?: string | undefined;
  src?: string;
  children: React.ReactNode;
  ariaLabel?: string | undefined;
  ariaLabelledBy?: string | undefined;
}

function Overlay({
  isOpen,
  onClose,
  className,
  backdropClassName,
  src,
  children,
  ariaLabel,
  ariaLabelledBy,
}: OverlayProps): React.JSX.Element {
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
