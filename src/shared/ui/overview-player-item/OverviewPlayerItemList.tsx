import type React from "react";
import type { WinnerPlayerProps } from "@/types";
import {
  DEFAULT_ROUND_AVERAGE_START_SCORE,
  formatRoundAverage,
  getCompletedRounds,
} from "@/lib/game/roundAverage";
import OverviewPlayerItem from "./OverviewPlayerItem";

const OVERVIEW_PLACEMENT_START = 4;

interface OverviewPlayerItemListProps {
  userMap: WinnerPlayerProps[];
  startScore?: number;
}

function OverviewPlayerItemList({
  userMap,
  startScore = DEFAULT_ROUND_AVERAGE_START_SCORE,
}: OverviewPlayerItemListProps): React.JSX.Element {
  return (
    <>
      {userMap.map((item: WinnerPlayerProps, index: number) => {
        const completedRounds = getCompletedRounds(item);
        const averageScore = formatRoundAverage(item, startScore);

        return (
          <OverviewPlayerItem
            key={item.id}
            name={item.name}
            placement={index + OVERVIEW_PLACEMENT_START}
            rounds={completedRounds}
            averagePerRound={averageScore}
          />
        );
      })}
    </>
  );
}

export default OverviewPlayerItemList;
