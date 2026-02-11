import { useLayoutEffect } from "react";
import clsx from "clsx";
import GamePlayerItem from "./GamePlayerItem";
import styles from "./GamePlayerItem.module.css";

interface GamePlayerItemListProps {
  isActive?: boolean;
  score: number;
  userMap: BASIC.WinnerPlayerProps[];
  round: number;
  isBust?: boolean;
  throwCount?: number;
}

function GamePlayerItemList({ userMap, round }: GamePlayerItemListProps): JSX.Element {
  const activePlayerId = userMap.find((item) => item.isActive)?.id ?? null;

  useLayoutEffect(() => {
    if (!activePlayerId || typeof window === "undefined") {
      return;
    }

    let firstAnimationFrameId = 0;
    let secondAnimationFrameId = 0;

    firstAnimationFrameId = window.requestAnimationFrame(() => {
      secondAnimationFrameId = window.requestAnimationFrame(() => {
        const activePlayerElement = document.querySelector<HTMLElement>(
          '[data-active-player="true"]',
        );
        activePlayerElement?.focus({ preventScroll: true });
        activePlayerElement?.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstAnimationFrameId);
      window.cancelAnimationFrame(secondAnimationFrameId);
    };
  }, [activePlayerId, userMap]);

  return (
    <>
      {userMap.map((item: BASIC.WinnerPlayerProps) => {
        const currentRound = item.rounds[round - 1];
        const previousRound = item.rounds[round - 2];

        return (
          <GamePlayerItem
            className={clsx(styles.gamePlayerItem, {
              [styles.activePlayer]: item.isActive === true,
              winner: item.isPlaying === false,
            })}
            key={item.id}
            name={item.name}
            isActive={item.isActive}
            value={item.score}
            gamePlayerItemThrow1={currentRound?.throw1}
            gamePlayerItemThrow2={currentRound?.throw2}
            gamePlayerItemThrow3={currentRound?.throw3}
            throw1IsBust={currentRound?.throw1IsBust}
            throw2IsBust={currentRound?.throw2IsBust}
            throw3IsBust={currentRound?.throw3IsBust}
            isBust={item.isBust}
            throwCount={item.throwCount}
            isPlaying={item.isPlaying}
            roundsCount={item.rounds}
            gamePlayerItemPrevThrow1={previousRound?.throw1}
            gamePlayerItemPrevThrow2={previousRound?.throw2}
            gamePlayerItemPrevThrow3={previousRound?.throw3}
            prevThrow1IsBust={previousRound?.throw1IsBust}
            prevThrow2IsBust={previousRound?.throw2IsBust}
            prevThrow3IsBust={previousRound?.throw3IsBust}
            id={item.isActive ? "playerid" : ""}
          />
        );
      })}
    </>
  );
}

export default GamePlayerItemList;
