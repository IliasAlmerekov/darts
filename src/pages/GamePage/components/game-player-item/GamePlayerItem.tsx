import React from "react";
import styles from "./GamePlayerItem.module.css";
import bustIconX from "@/assets/icons/delete-grey.svg";
import clsx from "clsx";
import type { ThrowSlot, ThrowSlots } from "../../lib/playerThrowsDisplay.logic";

interface GamePlayerItemProps {
  name?: string;
  isActive?: boolean;
  value: number;
  throwSlots: ThrowSlots;
  className: string;
  isPlaying?: boolean | undefined;
  id?: string;
  itemRef?: React.Ref<HTMLDivElement>;
}

const BUST_ICON = <img src={bustIconX} alt="Bust icon" />;

function renderSlotContent(slot: ThrowSlot): React.ReactNode {
  if (slot.kind === "value") return slot.label;
  if (slot.kind === "bust-icon") return BUST_ICON;
  return null;
}

function GamePlayerItem({
  name,
  isActive = false,
  value,
  throwSlots,
  className,
  isPlaying,
  id,
  itemRef,
}: GamePlayerItemProps): React.JSX.Element {
  const [slot1, slot2, slot3] = throwSlots;

  return (
    <div
      className={className}
      id={id}
      ref={itemRef}
      data-active-player={isActive ? "true" : undefined}
      role="group"
      aria-label={name}
      aria-current={isActive ? "true" : undefined}
      tabIndex={isActive ? -1 : undefined}
    >
      <div>
        <div
          className={clsx(styles.playeritemName, {
            [styles.activePlayerItemName ?? ""]: isActive === true,
          })}
        >
          {name}
        </div>
      </div>

      <div className={styles.throws}>
        <div
          className={clsx(styles.throwDisplay, {
            [styles.hidden ?? ""]: isPlaying === false,
          })}
        >
          <div
            className={clsx(styles.divDisplay, styles.copyLarge, {
              [styles.handleBust ?? ""]: slot1.isBust && !isActive,
            })}
          >
            {renderSlotContent(slot1)}
          </div>

          <div
            className={clsx(styles.divDisplay, styles.copyLarge, {
              [styles.handleBust ?? ""]: slot2.isBust && !isActive,
            })}
          >
            {renderSlotContent(slot2)}
          </div>

          <div
            className={clsx(styles.divDisplay, styles.copyLarge, {
              [styles.handleBust ?? ""]: slot3.isBust && !isActive,
            })}
          >
            {renderSlotContent(slot3)}
          </div>
        </div>

        <div className={styles.pointer}>
          <div
            className={clsx(styles.scoreDisplay, {
              [styles.hidden ?? ""]: isPlaying === false,
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

function getSlotLabel(slot: ThrowSlot): string | undefined {
  return slot.kind === "value" ? slot.label : undefined;
}

function isSameSlot(previousSlot: ThrowSlot, nextSlot: ThrowSlot): boolean {
  return (
    previousSlot.kind === nextSlot.kind &&
    previousSlot.isBust === nextSlot.isBust &&
    getSlotLabel(previousSlot) === getSlotLabel(nextSlot)
  );
}

// The list builds a new slot tuple on every render, so slots compare by value.
function areEqual(
  previousProps: Readonly<GamePlayerItemProps>,
  nextProps: Readonly<GamePlayerItemProps>,
): boolean {
  return (
    previousProps.name === nextProps.name &&
    previousProps.isActive === nextProps.isActive &&
    previousProps.value === nextProps.value &&
    isSameSlot(previousProps.throwSlots[0], nextProps.throwSlots[0]) &&
    isSameSlot(previousProps.throwSlots[1], nextProps.throwSlots[1]) &&
    isSameSlot(previousProps.throwSlots[2], nextProps.throwSlots[2]) &&
    previousProps.isPlaying === nextProps.isPlaying &&
    previousProps.id === nextProps.id &&
    previousProps.className === nextProps.className
  );
}

export default React.memo(GamePlayerItem, areEqual);
