import React, { useRef } from "react";
import clsx from "clsx";
import type { WinnerPlayerProps } from "@/types";
import useIsomorphicLayoutEffect from "@/shared/lib/useIsomorphicLayoutEffect";
import GamePlayerItem from "./GamePlayerItem";
import styles from "./GamePlayerItem.module.css";

interface GamePlayerItemListProps {
  userMap: WinnerPlayerProps[];
  round: number;
}

function GamePlayerItemListComponent({
  userMap,
  round,
}: GamePlayerItemListProps): React.JSX.Element {
  const activePlayerId = userMap.find((item) => item.isActive)?.id ?? null;
  const previousActivePlayerIdRef = useRef<number | null>(null);
  const activePlayerElementRef = useRef<HTMLDivElement | null>(null);

  useIsomorphicLayoutEffect(() => {
    if (activePlayerId === null) {
      previousActivePlayerIdRef.current = activePlayerId;
      return;
    }

    const didActivePlayerChange = previousActivePlayerIdRef.current !== activePlayerId;
    previousActivePlayerIdRef.current = activePlayerId;

    if (!didActivePlayerChange) {
      return;
    }

    let firstAnimationFrameId = 0;
    let secondAnimationFrameId = 0;

    firstAnimationFrameId = window.requestAnimationFrame(() => {
      secondAnimationFrameId = window.requestAnimationFrame(() => {
        const activePlayerElement = activePlayerElementRef.current;
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
  }, [activePlayerId]);

  return (
    <>
      {userMap.map((item: WinnerPlayerProps) => {
        const currentRound = item.rounds[round - 1];
        const previousRound = item.rounds[round - 2];

        return (
          <GamePlayerItem
            className={clsx(styles.gamePlayerItem, {
              [styles.activePlayer ?? ""]: item.isActive === true,
              [styles.finished ?? ""]: item.isPlaying === false,
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
            isPlaying={item.isPlaying}
            roundsCountLength={item.rounds.length}
            gamePlayerItemPrevThrow1={previousRound?.throw1}
            gamePlayerItemPrevThrow2={previousRound?.throw2}
            gamePlayerItemPrevThrow3={previousRound?.throw3}
            prevThrow1IsBust={previousRound?.throw1IsBust}
            prevThrow2IsBust={previousRound?.throw2IsBust}
            prevThrow3IsBust={previousRound?.throw3IsBust}
            {...(item.isActive ? { id: "playerid", itemRef: activePlayerElementRef } : {})}
          />
        );
      })}
    </>
  );
}

export default React.memo(
  GamePlayerItemListComponent,
  (previousProps, nextProps) =>
    previousProps.round === nextProps.round && previousProps.userMap === nextProps.userMap,
);
