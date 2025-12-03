import styles from "./OverviewPlayerItem.module.css";

type Props = {
  className?: string;
  rounds?: number;
  averagePerRound?: number;
  name?: string;
  placement?: number;
};

function OverviewPlayerItem({ ...props }: Props) {
  return (
    <div className={props.className}>
      <div className={styles.playerInfos}>
        <h4 className={styles.leaderBoard}>{props.placement}</h4>
        <div className="copylarge ">{props.name}</div>
      </div>
      <div className={styles.playerStatistics}>
        <div className={`copylarge ${styles.rounds}`}>
          Rounds <h4 className={styles.numberDisplay}>{props.rounds}</h4>
        </div>
        <div className={`copylarge ${styles.rounds}`}>
          Ø Round <h4 className={styles.numberDisplay}>{props.averagePerRound}</h4>
        </div>
      </div>
    </div>
  );
}
export default OverviewPlayerItem;
