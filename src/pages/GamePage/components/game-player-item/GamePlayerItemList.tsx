import React, { useRef } from "react";
import clsx from "clsx";
import type { WinnerPlayerProps } from "@/types";
import useIsomorphicLayoutEffect from "@/lib/useIsomorphicLayoutEffect";
import { getPlayerThrowsDisplay } from "../../lib/playerThrowsDisplay.logic";
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
      {userMap.map((item: WinnerPlayerProps) => (
        <GamePlayerItem
          className={clsx(styles.gamePlayerItem, {
            [styles.activePlayer ?? ""]: item.isActive === true,
            [styles.finished ?? ""]: item.isPlaying === false,
          })}
          key={item.id}
          name={item.name}
          isActive={item.isActive}
          value={item.score}
          throwSlots={getPlayerThrowsDisplay({
            currentRound: item.rounds[round - 1],
            previousRound: item.rounds[round - 2],
            isActive: item.isActive,
            isBust: item.isBust,
          })}
          isPlaying={item.isPlaying}
          {...(item.isActive ? { id: "playerid", itemRef: activePlayerElementRef } : {})}
        />
      ))}
    </>
  );
}

export default React.memo(
  GamePlayerItemListComponent,
  (previousProps, nextProps) =>
    previousProps.round === nextProps.round && previousProps.userMap === nextProps.userMap,
);
