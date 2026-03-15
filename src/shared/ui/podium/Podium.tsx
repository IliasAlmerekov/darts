import type React from "react";
import clsx from "clsx";
import type { WinnerPlayerProps } from "@/types";
import {
  DEFAULT_ROUND_AVERAGE_START_SCORE,
  formatRoundAverage,
  getCompletedRounds,
} from "@/lib/game/roundAverage";
import PodiumPlayerCard from "./PodiumPlayerCard";
import styles from "./Podium.module.css";

const PODIUM_FIRST_PLACE_INDEX = 0;
const PODIUM_SECOND_PLACE_INDEX = 1;
const PODIUM_THIRD_PLACE_INDEX = 2;
const PODIUM_PLACEMENT_OFFSET = 1;
const PODIUM_TWO_PLAYER_COUNT = 2;

interface PodiumProps {
  userMap?: WinnerPlayerProps[];
  list?: WinnerPlayerProps[];
  startScore?: number;
}

function Podium({
  userMap,
  list,
  startScore = DEFAULT_ROUND_AVERAGE_START_SCORE,
}: PodiumProps): React.JSX.Element {
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
              [styles.first ?? ""]: index === PODIUM_FIRST_PLACE_INDEX,
              [styles.second ?? ""]: index === PODIUM_SECOND_PLACE_INDEX,
              [styles.third ?? ""]: index === PODIUM_THIRD_PLACE_INDEX,
              [styles.hide ?? ""]:
                list?.length === PODIUM_TWO_PLAYER_COUNT && index === PODIUM_THIRD_PLACE_INDEX,
            })}
            rounds={completedRound}
            name={item.name}
            placement={index + PODIUM_PLACEMENT_OFFSET + "."}
            averagePerRound={averagePerRound}
            isWinner={index === PODIUM_FIRST_PLACE_INDEX}
          />
        );
      })}
    </div>
  );
}

export default Podium;
