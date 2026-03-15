import React from "react";
import styles from "./Dialog.module.css";

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) =>
      !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true",
  );
}

interface DialogProps {
  isOpen?: boolean;
  onClose?: () => void;
  className: string;
  backdropClassName: string;
  closeButtonLabel?: string;
  closeIconSrc?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  children: React.ReactNode;
}

function Dialog({
  isOpen = false,
  onClose,
  className,
  backdropClassName,
  closeButtonLabel = "Close overlay",
  closeIconSrc,
  ariaLabel,
  ariaLabelledBy,
  children,
}: DialogProps): React.ReactNode {
  const dialogRef = React.useRef<HTMLDivElement | null>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);

  const handleDocumentKeyDown = React.useCallback(
    (event: KeyboardEvent): void => {
      if (!isOpen) {
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialogElement = dialogRef.current;
      if (!dialogElement) {
        return;
      }

      const focusableElements = getFocusableElements(dialogElement);
      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogElement.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0] ?? dialogElement;
      const lastFocusableElement = focusableElements[focusableElements.length - 1] ?? dialogElement;
      const activeElement =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isFocusInsideDialog = activeElement ? dialogElement.contains(activeElement) : false;

      if (!isFocusInsideDialog) {
        event.preventDefault();
        (event.shiftKey ? lastFocusableElement : firstFocusableElement).focus();
        return;
      }

      const activeIndex = activeElement ? focusableElements.indexOf(activeElement) : -1;
      const step = event.shiftKey ? -1 : 1;
      const fallbackIndex = event.shiftKey ? focusableElements.length - 1 : 0;
      const nextIndex =
        activeIndex === -1
          ? fallbackIndex
          : (activeIndex + step + focusableElements.length) % focusableElements.length;
      const nextFocusableElement = focusableElements[nextIndex] ?? dialogElement;

      event.preventDefault();
      nextFocusableElement.focus();
    },
    [isOpen, onClose],
  );

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialogElement = dialogRef.current;
    if (!dialogElement) {
      return;
    }

    const focusableElements = getFocusableElements(dialogElement);
    const initialFocusElement = focusableElements[0] ?? dialogElement;
    initialFocusElement.focus();

    return () => {
      const previousActiveElement = previousActiveElementRef.current;
      if (previousActiveElement && document.contains(previousActiveElement)) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener("keydown", handleDocumentKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleDocumentKeyDown, true);
    };
  }, [handleDocumentKeyDown, isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={backdropClassName}>
      <div
        ref={dialogRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
      >
        {onClose ? (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label={closeButtonLabel}
          >
            {closeIconSrc ? <img src={closeIconSrc} alt="" aria-hidden="true" /> : null}
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export default Dialog;
