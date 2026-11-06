import clsx from "clsx";
import React from "react";
import styles from "./GamePlayerItem.module.css";

interface FinishedGamePlayerItemProps {
  name?: string;
  place?: string;
}

interface Props {
  userMap?: { name: string }[];
}

function FinishedGamePlayerItem({ name, place }: FinishedGamePlayerItemProps): React.JSX.Element {
  return (
    <div className={clsx(styles.gamePlayerItem, styles.finished)} role="listitem">
      <div>
        <div className={styles.copylarge}>{name}</div>
      </div>
      <div className={styles.place}>{place}</div>
    </div>
  );
}

function FinishedGamePlayerItemList({ userMap }: Props): React.JSX.Element | null {
  if (!userMap || userMap.length === 0) {
    return null;
  }

  return (
    <div className={styles.finishedPlayerList}>
      <div className={clsx(styles.copylarge, styles.finishedPlayers)}>Finished Players</div>
      <div className={styles.finishedPlayerItems} role="list" aria-label="Finished players list">
        {userMap.map((item, index) => (
          <FinishedGamePlayerItem key={item.name} name={item.name} place={`${index + 1}.`} />
        ))}
      </div>
    </div>
  );
}

export default React.memo(
  FinishedGamePlayerItemList,
  (previousProps, nextProps) => previousProps.userMap === nextProps.userMap,
);
