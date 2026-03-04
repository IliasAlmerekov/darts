import React from "react";
import styles from "./GamePlayerItem.module.css";
import bustIconX from "@/assets/icons/delete-grey.svg";
import clsx from "clsx";
import { usePlayerThrowsDisplay } from "../../hooks/usePlayerThrowsDisplay";

interface GamePlayerItemProps {
  name?: string;
  isActive?: boolean;
  value: number;
  gamePlayerItemThrow1?: number | string | JSX.Element;
  gamePlayerItemThrow2?: number | string | JSX.Element;
  gamePlayerItemThrow3?: number | string | JSX.Element;
  throw1IsBust?: boolean;
  throw2IsBust?: boolean;
  throw3IsBust?: boolean;
  className: string;
  src?: string;
  isBust?: boolean;
  throwCount?: number;
  isPlaying?: boolean;
  roundsCountLength: number;
  gamePlayerItemPrevThrow1?: number | string | JSX.Element;
  gamePlayerItemPrevThrow2?: number | string | JSX.Element;
  gamePlayerItemPrevThrow3?: number | string | JSX.Element;
  prevThrow1IsBust?: boolean;
  prevThrow2IsBust?: boolean;
  prevThrow3IsBust?: boolean;
  id: string;
}

const bustIcon = <img src={bustIconX} alt="Bust icon" />;

function GamePlayerItem({
  name,
  isActive = false,
  value,
  gamePlayerItemThrow1,
  gamePlayerItemThrow2,
  gamePlayerItemThrow3,
  throw1IsBust,
  throw2IsBust,
  throw3IsBust,
  className,
  isPlaying,
  roundsCountLength,
  gamePlayerItemPrevThrow1,
  gamePlayerItemPrevThrow2,
  gamePlayerItemPrevThrow3,
  prevThrow1IsBust,
  prevThrow2IsBust,
  prevThrow3IsBust,
  id,
}: GamePlayerItemProps): JSX.Element {
  // Business logic: calculate throw display values
  const displayThrows = usePlayerThrowsDisplay({
    isActive,
    roundsCountLength,
    currentThrow1: gamePlayerItemThrow1,
    currentThrow2: gamePlayerItemThrow2,
    currentThrow3: gamePlayerItemThrow3,
    prevThrow1: gamePlayerItemPrevThrow1,
    prevThrow2: gamePlayerItemPrevThrow2,
    prevThrow3: gamePlayerItemPrevThrow3,
    throw1IsBust,
    throw2IsBust,
    throw3IsBust,
    prevThrow1IsBust,
    prevThrow2IsBust,
    prevThrow3IsBust,
    bustIcon,
  });

  return (
    <div
      className={className}
      id={id}
      data-active-player={isActive ? "true" : undefined}
      tabIndex={isActive ? -1 : undefined}
    >
      <div>
        <div
          className={clsx(styles.playeritemName, {
            [styles.activePlayerItemName]: isActive === true,
          })}
        >
          {name}
        </div>
      </div>

      <div className={styles.throws}>
        <div
          className={clsx(styles.throwDisplay, {
            hidden: isPlaying === false,
          })}
        >
          <div
            className={clsx(styles.divDisplay, "copylarge", {
              [styles.handleBust]: displayThrows.throw1IsBust && !isActive,
            })}
          >
            {displayThrows.throw1}
          </div>

          <div
            className={clsx(styles.divDisplay, "copylarge", {
              [styles.handleBust]: displayThrows.throw2IsBust && !isActive,
            })}
          >
            {displayThrows.throw2}
          </div>

          <div
            className={clsx(styles.divDisplay, "copylarge", {
              [styles.handleBust]: displayThrows.throw3IsBust && !isActive,
            })}
          >
            {displayThrows.throw3}
          </div>
        </div>

        <div className={styles.pointer}>
          <div
            className={clsx(styles.scoreDisplay, {
              hidden: isPlaying === false,
            })}
          >
            Score
          </div>
          <div className={styles.valueDisplay}>{value}</div>
        </div>
      </div>
    </div>
  );
}

function areEqual(
  previousProps: Readonly<GamePlayerItemProps>,
  nextProps: Readonly<GamePlayerItemProps>,
): boolean {
  return (
    previousProps.name === nextProps.name &&
    previousProps.isActive === nextProps.isActive &&
    previousProps.value === nextProps.value &&
    previousProps.gamePlayerItemThrow1 === nextProps.gamePlayerItemThrow1 &&
    previousProps.gamePlayerItemThrow2 === nextProps.gamePlayerItemThrow2 &&
    previousProps.gamePlayerItemThrow3 === nextProps.gamePlayerItemThrow3 &&
    previousProps.throw1IsBust === nextProps.throw1IsBust &&
    previousProps.throw2IsBust === nextProps.throw2IsBust &&
    previousProps.throw3IsBust === nextProps.throw3IsBust &&
    previousProps.isPlaying === nextProps.isPlaying &&
    previousProps.roundsCountLength === nextProps.roundsCountLength &&
    previousProps.gamePlayerItemPrevThrow1 === nextProps.gamePlayerItemPrevThrow1 &&
    previousProps.gamePlayerItemPrevThrow2 === nextProps.gamePlayerItemPrevThrow2 &&
    previousProps.gamePlayerItemPrevThrow3 === nextProps.gamePlayerItemPrevThrow3 &&
    previousProps.prevThrow1IsBust === nextProps.prevThrow1IsBust &&
    previousProps.prevThrow2IsBust === nextProps.prevThrow2IsBust &&
    previousProps.prevThrow3IsBust === nextProps.prevThrow3IsBust &&
    previousProps.id === nextProps.id &&
    previousProps.className === nextProps.className
  );
}

export default React.memo(GamePlayerItem, areEqual);
