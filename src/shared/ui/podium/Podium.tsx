import clsx from "clsx";
import type { WinnerPlayerProps } from "@/types";
import { formatRoundAverage, getCompletedRounds } from "@/shared/lib/roundAverage";
import PodiumPlayerCard from "./PodiumPlayerCard";
import styles from "./Podium.module.css";

interface PodiumProps {
  name?: string;
  userMap?: WinnerPlayerProps[];
  list?: WinnerPlayerProps[];
  startScore?: number;
}

function Podium({ userMap, list, startScore = 301 }: PodiumProps): JSX.Element {
  if (!userMap || userMap.length === 0) {
    return <div className={styles.podium} />;
  }

  return (
    <div className={styles.podium}>
      {userMap.map((item: WinnerPlayerProps, index: number) => {
        const completedRound = getCompletedRounds(item);
        const averagePerRound = formatRoundAverage(item, startScore);

        return (
          <PodiumPlayerCard
            key={item.id}
            className={clsx(styles.podiumPlayerCard, {
              [styles.first ?? ""]: index === 0,
              [styles.second ?? ""]: index === 1,
              [styles.third ?? ""]: index === 2,
              [styles.hide ?? ""]: list?.length === 2 && index === 2,
            })}
            rounds={completedRound}
            name={item.name}
            placement={index + 1 + "."}
            averagePerRound={averagePerRound}
            isWinner={index === 0}
          />
        );
      })}
    </div>
  );
}

export default Podium;
