import React, { useRef } from "react";
import clsx from "clsx";
import type { GameMode } from "@/types";
import type { WinnerPlayerProps } from "@/types";
import useIsomorphicLayoutEffect from "@/lib/useIsomorphicLayoutEffect";
import { getPlayerThrowsDisplay } from "../../lib/playerThrowsDisplay.logic";
import GamePlayerItem from "./GamePlayerItem";
import styles from "./GamePlayerItem.module.css";

/**
 * Whether the user can see both the top and the bottom edge of `element`. Asks the browser
 * what it shows at those points, so the sticky keypad, a clipping scroll container and the
 * viewport edge all count, whichever of them hides the card.
 */
function isOnScreen(element: HTMLElement): boolean {
  const { left, right, top, bottom } = element.getBoundingClientRect();
  const x = (left + right) / 2;
  return [top + 1, bottom - 1].every((y) => element.contains(document.elementFromPoint(x, y)));
}

interface GamePlayerItemListProps {
  userMap: WinnerPlayerProps[];
  round: number;
  mode?: GameMode;
  gameFinished?: boolean;
}

function GamePlayerItemListComponent({
  userMap,
  round,
  mode,
  gameFinished = false,
}: GamePlayerItemListProps): React.JSX.Element {
  const activePlayerId = userMap.find((item) => item.isActive)?.id ?? null;
  const previousActivePlayerIdRef = useRef<number | null>(null);
  const activePlayerElementRef = useRef<HTMLDivElement | null>(null);

  // Runs after every throw, not only on a turn change: on iPad a tap stops a smooth scroll
  // midway, and the next throw has to finish the trip to the active player.
  useIsomorphicLayoutEffect(() => {
    if (activePlayerId === null) {
      previousActivePlayerIdRef.current = activePlayerId;
      return;
    }

    let firstAnimationFrameId = 0;
    let secondAnimationFrameId = 0;

    firstAnimationFrameId = window.requestAnimationFrame(() => {
      secondAnimationFrameId = window.requestAnimationFrame(() => {
        const activePlayerElement = activePlayerElementRef.current;
        if (activePlayerElement === null) {
          return;
        }

        // Recorded only once the frame runs, so a throw that cancels it still moves focus.
        const didActivePlayerChange = previousActivePlayerIdRef.current !== activePlayerId;
        previousActivePlayerIdRef.current = activePlayerId;

        if (didActivePlayerChange) {
          activePlayerElement.focus({ preventScroll: true });
        } else if (isOnScreen(activePlayerElement)) {
          return;
        }

        activePlayerElement.scrollIntoView({
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
            ...(item.isPlaying !== false && !gameFinished && mode
              ? { score: item.score, throwCount: item.throwCount, mode }
              : {}),
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
    previousProps.round === nextProps.round &&
    previousProps.userMap === nextProps.userMap &&
    previousProps.mode === nextProps.mode &&
    previousProps.gameFinished === nextProps.gameFinished,
);
