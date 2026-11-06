import React, { useRef } from "react";
import clsx from "clsx";
import styles from "./Keyboard.module.css";
import Undo from "@/assets/icons/undo.svg";

/** How far a finger may move between touchstart and touchend and still count as a tap. */
const TAP_SLOP_PX = 10;

interface NumberButtonProps {
  value: number | "Undo" | "Triple" | "Double";
  handleClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

export function NumberButton({
  value,
  handleClick,
  isActive,
  disabled,
}: NumberButtonProps): React.JSX.Element {
  const isToggle = value === "Double" || value === "Triple";

  // WebKit on iPad ignores `touch-action: manipulation` here (#421): it holds each tap for a
  // possible double tap and zooms on two fast taps. Cancelling `touchend` stops both and also
  // drops the click WebKit would send after it, so a touch acts here and only here.
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>): void => {
    // `targetTouches`: fingers on this button. A finger on another key is a separate tap.
    const touch = event.targetTouches[0];
    touchStartRef.current =
      event.targetTouches.length === 1 && touch ? { x: touch.clientX, y: touch.clientY } : null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLButtonElement>): void => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    // A second finger still on this button is a pinch: leave it to the browser. So is a
    // touchend WebKit no longer lets us cancel: its click still comes and acts through onClick.
    if (event.targetTouches.length > 0 || touch === undefined || !event.cancelable) return;
    event.preventDefault();

    // A finger that moved past the slop was scrolling. A native click skips that touch too.
    const isTap =
      start !== null &&
      Math.abs(touch.clientX - start.x) <= TAP_SLOP_PX &&
      Math.abs(touch.clientY - start.y) <= TAP_SLOP_PX;
    if (isTap && !disabled) handleClick?.();
  };

  return (
    <button
      disabled={disabled}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-pressed={isToggle ? (isActive ?? false) : undefined}
      className={clsx(styles.button, styles.copylarge, {
        [styles.undo ?? ""]: value === "Undo",
        [styles.triple ?? ""]: value === "Triple",
        [styles.double ?? ""]: value === "Double",
        [styles.active ?? ""]: isActive,
        [styles.disabled ?? ""]: disabled,
      })}
    >
      {value === "Undo" ? <img src={Undo} alt="Undo" /> : value}
    </button>
  );
}
