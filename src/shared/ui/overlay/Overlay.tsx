import React from "react";
import { Dialog } from "@/shared/ui/dialog";
import styles from "./Overlay.module.css";

interface OverlayProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  backdropClassName?: string;
  src?: string;
  children: React.ReactNode;
  ariaLabel?: string;
  ariaLabelledBy?: string;
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
  const optionalDialogProps = {
    ...(isOpen !== undefined ? { isOpen } : {}),
    ...(onClose !== undefined ? { onClose } : {}),
    ...(src !== undefined ? { closeIconSrc: src } : {}),
    ...(ariaLabel !== undefined ? { ariaLabel } : {}),
    ...(ariaLabelledBy !== undefined ? { ariaLabelledBy } : {}),
  };

  return (
    <Dialog className={containerClass} backdropClassName={backgroundClass} {...optionalDialogProps}>
      {children}
    </Dialog>
  );
}
export default Overlay;
