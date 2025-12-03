import { useState } from "react";
import styles from "./Keyboard.module.css";
import { NumberButton } from "./NumberButton";

interface KeyboardProps {
  onThrow: (value: string | number) => void;
  disabled?: boolean;
}

export function Keyboard({ onThrow, disabled }: KeyboardProps): JSX.Element {
  const [doubleNext, setDoubleNext] = useState(false);
  const [tripleNext, setTripleNext] = useState(false);

  const btnValues: (number | "Triple" | "Double")[][] = [
    [1, 2, 3, 4, 5, "Double", 6, 7, 8],
    [9, 10, "Triple", 11, 12, 13, 14, 15, 16],
    [17, 18, 19, 20, 25, 0],
  ];

  const handleButtonClick = (btn: number | "Double" | "Triple"): void => {
    if (disabled) return;

    switch (true) {
      case btn === "Double":
        setDoubleNext((prev) => !prev);
        setTripleNext(false);
        break;
      case btn === "Triple":
        setTripleNext((prev) => !prev);
        setDoubleNext(false);
        break;
      case doubleNext && typeof btn === "number":
        onThrow(`D${btn}`);
        setDoubleNext(false);
        break;
      case tripleNext && typeof btn === "number":
        onThrow(`T${btn}`);
        setTripleNext(false);
        break;
      default:
        onThrow(btn);
        break;
    }
  };

  return (
    <div className={styles.keyboard}>
      {btnValues.flat().map((btn, i) => (
        <NumberButton
          handleClick={() => handleButtonClick(btn)}
          value={btn}
          key={i}
          isActive={(doubleNext && btn === "Double") || (tripleNext && btn === "Triple")}
          disabled={
            disabled ||
            (tripleNext && btn === 25) ||
            (tripleNext && btn === 0) ||
            (doubleNext && btn === 0)
          }
        />
      ))}
    </div>
  );
}
