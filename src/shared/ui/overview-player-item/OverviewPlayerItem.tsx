import clsx from "clsx";
import styles from "./OverviewPlayerItem.module.css";

interface Props {
  className?: string;
  rounds?: number;
  averagePerRound?: number | string;
  name?: string;
  placement?: number;
}

function OverviewPlayerItem({ ...props }: Props): React.JSX.Element {
  return (
    <div className={clsx(styles.overviewPlayerItem, props.className)}>
      <div className={styles.playerInfos}>
        <h4 className={styles.leaderBoard}>{props.placement}</h4>
        <div className={clsx(styles.copylarge, styles.playerName)}>{props.name}</div>
      </div>
      <div className={styles.playerStatistics}>
        <div className={clsx(styles.copylarge, styles.rounds, styles.statItem)}>
          Rounds <h4 className={styles.numberDisplay}>{props.rounds}</h4>
        </div>
        <div className={clsx(styles.copylarge, styles.rounds, styles.statItem)}>
          Ø Round <h4 className={styles.numberDisplay}>{props.averagePerRound}</h4>
        </div>
      </div>
    </div>
  );
}
export default OverviewPlayerItem;
