import clsx from "clsx";
import PodiumPlayerCard from "./PodiumPlayerCard";
import styles from "./Podium.module.css";

interface PodiumProps {
  name?: string;
  userMap?: BASIC.WinnerPlayerProps[];
  list?: BASIC.WinnerPlayerProps[];
  startScore?: number;
}

function Podium({ userMap, list, startScore = 301 }: PodiumProps): JSX.Element {
  if (!userMap || userMap.length === 0) {
    return <div className={styles.podium} />;
  }

  return (
    <div className={styles.podium}>
      {userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRound =
          item.roundCount ??
          (item.rounds[item.rounds.length - 1]?.throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length);

        const averageScoreRaw =
          completedRound > 0
            ? (item.scoreAverage ?? (startScore - item.score) / completedRound)
            : 0;
        const averagePerRound = completedRound > 0 ? averageScoreRaw.toFixed(2) : (0).toFixed(2);

        return (
          <PodiumPlayerCard
            key={index}
            className={clsx(styles.podiumPlayerCard, {
              [styles.first]: index === 0,
              [styles.second]: index === 1,
              [styles.third]: index === 2,
              [styles.hide]: list?.length === 2 && index === 2,
            })}
            rounds={completedRound}
            name={item.name}
            placement={index + 1 + "."}
            averagePerRound={averagePerRound}
          />
        );
      })}
    </div>
  );
}

export default Podium;
