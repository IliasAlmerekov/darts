import styles from "./PodiumPlayerCard.module.css";
import React from "react";

type Props = {
  name?: string;
  placement?: number | string;
  className?: string;
  rounds?: number | string;
  averagePerRound?: number | string;
};

function PodiumPlayerCard({ ...props }: Props): React.JSX.Element {
  return (
    <div className={props.className}>
      <h4 className={`${styles.centerAlign} ${styles.playerName}`}>{props.name}</h4>
      <div className={`copylarge ${styles.centerAlign} ${styles.color}`}>
        Rounds
        <h4 className={styles.number}>{props.rounds}</h4>
      </div>
      <div className={`copylarge ${styles.centerAlign} ${styles.color}`}>
        Ø Round
        <h4 className={styles.number}>{props.averagePerRound}</h4>
      </div>
      <div className={`copylarge ${styles.placementRound}`}>{props.placement}</div>
    </div>
  );
}
export default PodiumPlayerCard;
