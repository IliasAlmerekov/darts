import styles from "./Keyboard.module.css";
import clsx from "clsx";
import Undo from "@/icons/undo.svg";

type Props = {
  value: number | "Undo" | "Triple" | "Double";
  handleClick?: () => void;
  isActive?: boolean;
  disabled?: boolean;
};

function NumberButton({ ...props }: Props) {
  return (
    <button
      disabled={props.disabled}
      onClick={props.handleClick}
      className={clsx(styles.button, "copylarge", {
        [styles.undo]: props.value === "Undo",
        [styles.triple]: props.value === "Triple",
        [styles.double]: props.value === "Double",
        [styles.active]: props.isActive,
        [styles.disabled]: props.disabled,
      })}
    >
      {props.value === "Undo" ? <img src={Undo} alt="Undo" /> : props.value}
    </button>
  );
}
export default NumberButton;
