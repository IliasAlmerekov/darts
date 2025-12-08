import clsx from "clsx";
import styles from "./Keyboard.module.css";
import Undo from "@/icons/undo.svg";

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
}: NumberButtonProps): JSX.Element {
  return (
    <button
      disabled={disabled}
      onClick={handleClick}
      className={clsx(styles.button, styles.copylarge, {
        [styles.undo]: value === "Undo",
        [styles.triple]: value === "Triple",
        [styles.double]: value === "Double",
        [styles.active]: isActive,
        [styles.disabled]: disabled,
      })}
    >
      {value === "Undo" ? <img src={Undo} alt="Undo" /> : value}
    </button>
  );
}
