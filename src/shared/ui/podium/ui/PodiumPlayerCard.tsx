import clsx from "clsx";
import styles from "./PodiumPlayerCard.module.css";
import React from "react";

type Props = {
  name?: string;
  placement?: number | string;
  className?: string;
  rounds?: number | string;
  averagePerRound?: number | string;
  isWinner?: boolean;
};

function PodiumPlayerCard({ ...props }: Props): React.JSX.Element {
  return (
    <div
      className={clsx(styles.podiumPlayerCard, props.className, {
        [styles.winnerCard]: props.isWinner,
      })}
    >
      {props.isWinner ? <div className={styles.winnerBadge}>WINNER</div> : null}
      <h4 className={styles.playerName}>{props.name}</h4>
      <div className={`copylarge ${styles.statRow} ${styles.color}`}>
        <span>Rounds</span>
        <h4 className={styles.number}>{props.rounds}</h4>
      </div>
      <div className={`copylarge ${styles.statRow} ${styles.color}`}>
        <span>Ø AVG</span>
        <h4 className={styles.number}>{props.averagePerRound}</h4>
      </div>
      <div className={`copylarge ${styles.placementRound}`}>{props.placement}</div>
    </div>
  );
}
export default PodiumPlayerCard;
