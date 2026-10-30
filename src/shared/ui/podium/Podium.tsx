import type React from "react";
import clsx from "clsx";
import type { StandingsEntry } from "@/lib/game/finishedGameStandings";
import PodiumPlayerCard from "./PodiumPlayerCard";
import styles from "./Podium.module.css";

const PODIUM_FIRST_PLACE_INDEX = 0;
const PODIUM_SECOND_PLACE_INDEX = 1;
const PODIUM_THIRD_PLACE_INDEX = 2;
const PODIUM_PLACEMENT_OFFSET = 1;

interface PodiumProps {
  userMap?: StandingsEntry[];
}

function Podium({ userMap }: PodiumProps): React.JSX.Element {
  if (!userMap || userMap.length === 0) {
    return <div className={styles.podium} />;
  }

  return (
    <div className={styles.podium}>
      {userMap.map((item: StandingsEntry, index: number) => (
        <PodiumPlayerCard
          key={item.id}
          className={clsx(styles.podiumPlayerCard, {
            [styles.first ?? ""]: index === PODIUM_FIRST_PLACE_INDEX,
            [styles.second ?? ""]: index === PODIUM_SECOND_PLACE_INDEX,
            [styles.third ?? ""]: index === PODIUM_THIRD_PLACE_INDEX,
            [styles.hide ?? ""]: item.isPlaceholder,
          })}
          rounds={item.rounds}
          name={item.name}
          placement={index + PODIUM_PLACEMENT_OFFSET + "."}
          threeDartAverage={item.threeDartAverage}
          isWinner={index === PODIUM_FIRST_PLACE_INDEX}
        />
      ))}
    </div>
  );
}

export default Podium;
