import styles from "./GamePlayerItem.module.css";
import bustIconX from "@/icons/delete-grey.svg";
import clsx from "clsx";
import { useMemo } from "react";

interface GamePlayerItemProps {
  name?: string;
  isActive?: boolean;
  value: number;
  gamePlayerItemThrow1?: number | string | JSX.Element;
  gamePlayerItemThrow2?: number | string | JSX.Element;
  gamePlayerItemThrow3?: number | string | JSX.Element;
  className: string;
  src?: string;
  isBust?: boolean;
  throwCount?: number;
  isPlaying?: boolean;
  roundsCount: BASIC.Round[];
  gamePlayerItemPrevThrow1?: number | string | JSX.Element;
  gamePlayerItemPrevThrow2?: number | string | JSX.Element;
  gamePlayerItemPrevThrow3?: number | string | JSX.Element;
  id: string;
}

const bustIcon = <img src={bustIconX} alt="Bust icon" />;

function GamePlayerItem({
  name,
  isActive,
  value,
  gamePlayerItemThrow1,
  gamePlayerItemThrow2,
  gamePlayerItemThrow3,
  className,
  isBust,
  throwCount,
  isPlaying,
  roundsCount,
  gamePlayerItemPrevThrow1,
  gamePlayerItemPrevThrow2,
  gamePlayerItemPrevThrow3,
  id,
}: GamePlayerItemProps): JSX.Element {
  // Calculate display values without mutating props
  const displayThrows = useMemo(() => {
    // Clear previous throws for active player in rounds > 1
    const shouldClearPrev = isActive && roundsCount?.length > 1;

    // Determine throw3 value based on bust state
    let computedThrow3 = gamePlayerItemThrow3;
    let computedThrow2 = gamePlayerItemThrow2;

    if (isBust && throwCount === 1) {
      computedThrow3 = bustIcon;
    } else if (isBust && throwCount === 0) {
      computedThrow2 = bustIcon;
      computedThrow3 = bustIcon;
    }

    return {
      throw1: gamePlayerItemThrow1,
      throw2: computedThrow2,
      throw3: computedThrow3,
      prevThrow1: shouldClearPrev ? undefined : gamePlayerItemPrevThrow1,
      prevThrow2: shouldClearPrev ? undefined : gamePlayerItemPrevThrow2,
      prevThrow3: shouldClearPrev ? undefined : gamePlayerItemPrevThrow3,
    };
  }, [
    gamePlayerItemThrow1,
    gamePlayerItemThrow2,
    gamePlayerItemThrow3,
    gamePlayerItemPrevThrow1,
    gamePlayerItemPrevThrow2,
    gamePlayerItemPrevThrow3,
    isActive,
    isBust,
    throwCount,
    roundsCount?.length,
  ]);

  function getDisplayValue(
    currentThrow?: number | string | JSX.Element,
    prevThrow?: number | string | JSX.Element,
  ): number | string | JSX.Element | undefined {
    return currentThrow !== undefined ? currentThrow : prevThrow;
  }

  return (
    <div className={className} id={id}>
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
              [styles.handleBust]: !isActive && throwCount === 0,
            })}
          >
            {getDisplayValue(displayThrows.throw1, displayThrows.prevThrow1)}
          </div>

          <div
            className={clsx(styles.divDisplay, "copylarge", {
              [styles.handleBust]: !isActive && throwCount === 1,
            })}
          >
            {getDisplayValue(displayThrows.throw2, displayThrows.prevThrow2)}
          </div>

          <div
            className={clsx(styles.divDisplay, "copylarge", {
              [styles.handleBust]: isBust && throwCount === 2,
            })}
          >
            {getDisplayValue(displayThrows.throw3, displayThrows.prevThrow3)}
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

export default GamePlayerItem;
