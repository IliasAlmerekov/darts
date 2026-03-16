import React from "react";
import clsx from "clsx";
import styles from "./Keyboard.module.css";
import Undo from "@/assets/icons/undo.svg";

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

  return (
    <button
      disabled={disabled}
      onClick={handleClick}
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
