import styles from "./GamePlayerItem.module.css";

type FinishedPlayerItem = {
  name: string;
  position?: number | null;
};

type Props = {
  userMap?: FinishedPlayerItem[];
};

function FinishedGamePlayerItemList({ userMap }: Props) {
  const FinishedGamePlayerItem = ({ name, place }: { name?: string; place?: string }) => (
    <div className={`${styles.gamePlayerItem} ${styles.finished}`}>
      <div>
        <div className={styles.copylarge}>{name}</div>
      </div>
      <div className={styles.place}>{place}</div>
    </div>
  );

  if (!userMap || userMap.length === 0) {
    return <></>;
  }

  return (
    <div className={styles.finishedPlayerList}>
      <div className={`${styles.copylarge} ${styles.finishedPlayers}`}>Finished Players</div>
      {userMap.map((item, index) => {
        // Use backend position if available, otherwise use order in array
        const place = item.position != null && item.position > 0 ? item.position : index + 1;
        return <FinishedGamePlayerItem key={index} name={item.name} place={`${place}.`} />;
      })}
    </div>
  );
}

export default FinishedGamePlayerItemList;

import styles from "./GamePlayerItem.module.css";

type Props = {
  userMap?: { name: string }[];
};

function FinishedGamePlayerItemList({ userMap }: Props) {
  const FinishedGamePlayerItem = ({ name, place }: { name?: string; place?: string }) => (
    <div className={`${styles.gamePlayerItem} ${styles.finished}`}>
      <div>
        <div className={styles.copylarge}>{name}</div>
      </div>
      <div className={styles.place}>{place}</div>
    </div>
  );

  if (!userMap || userMap.length === 0) {
    return <></>;
  }

  return (
    <div className={styles.finishedPlayerList}>
      <div className={`${styles.copylarge} ${styles.finishedPlayers}`}>Finished Players</div>
      {userMap.map((item, index) => (
        <FinishedGamePlayerItem key={index} name={item.name} place={`${index + 1}.`} />
      ))}
    </div>
  );
}

export default FinishedGamePlayerItemList;
