import "./Keyboard.css";
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
      className={clsx("button copylarge", {
        undo: props.value === "Undo",
        triple: props.value === "Triple",
        double: props.value === "Double",
        active: props.isActive,
        disabled: props.disabled,
      })}
    >
      {props.value === "Undo" ? <img src={Undo} alt="Undo" /> : props.value}
    </button>
  );
}
export default NumberButton;
