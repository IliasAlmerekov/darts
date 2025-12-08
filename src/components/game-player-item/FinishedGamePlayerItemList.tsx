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
