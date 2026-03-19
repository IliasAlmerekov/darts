import React, { useRef } from "react";
import clsx from "clsx";
import type { WinnerPlayerProps } from "@/types";
import useIsomorphicLayoutEffect from "@/shared/lib/useIsomorphicLayoutEffect";
import GamePlayerItem from "./GamePlayerItem";
import styles from "./GamePlayerItem.module.css";

function formatThrowLabel(
  value: number | string | undefined,
  isDouble?: boolean,
  isTriple?: boolean,
): React.ReactNode {
  if (value === undefined) return undefined;
  if (isDouble) return `D${value}`;
  if (isTriple) return `T${value}`;
  return value;
}

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
            gamePlayerItemThrow1={formatThrowLabel(
              currentRound?.throw1,
              currentRound?.throw1IsDouble,
              currentRound?.throw1IsTriple,
            )}
            gamePlayerItemThrow2={formatThrowLabel(
              currentRound?.throw2,
              currentRound?.throw2IsDouble,
              currentRound?.throw2IsTriple,
            )}
            gamePlayerItemThrow3={formatThrowLabel(
              currentRound?.throw3,
              currentRound?.throw3IsDouble,
              currentRound?.throw3IsTriple,
            )}
            throw1IsBust={currentRound?.throw1IsBust}
            throw2IsBust={currentRound?.throw2IsBust}
            throw3IsBust={currentRound?.throw3IsBust}
            isBust={item.isBust}
            isPlaying={item.isPlaying}
            roundsCountLength={item.rounds.length}
            gamePlayerItemPrevThrow1={formatThrowLabel(
              previousRound?.throw1,
              previousRound?.throw1IsDouble,
              previousRound?.throw1IsTriple,
            )}
            gamePlayerItemPrevThrow2={formatThrowLabel(
              previousRound?.throw2,
              previousRound?.throw2IsDouble,
              previousRound?.throw2IsTriple,
            )}
            gamePlayerItemPrevThrow3={formatThrowLabel(
              previousRound?.throw3,
              previousRound?.throw3IsDouble,
              previousRound?.throw3IsTriple,
            )}
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
