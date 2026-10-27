import type React from "react";
import type { WinnerPlayerProps } from "@/types";
import { formatThreeDartAverage, getCompletedRounds } from "@/lib/game/threeDartAverage";
import OverviewPlayerItem from "./OverviewPlayerItem";

const OVERVIEW_PLACEMENT_START = 4;

interface OverviewPlayerItemListProps {
  userMap: WinnerPlayerProps[];
}

function OverviewPlayerItemList({ userMap }: OverviewPlayerItemListProps): React.JSX.Element {
  return (
    <>
      {userMap.map((item: WinnerPlayerProps, index: number) => {
        const completedRounds = getCompletedRounds(item);
        const averageScore = formatThreeDartAverage(item);

        return (
          <OverviewPlayerItem
            key={item.id}
            name={item.name}
            placement={index + OVERVIEW_PLACEMENT_START}
            rounds={completedRounds}
            threeDartAverage={averageScore}
          />
        );
      })}
    </>
  );
}

export default OverviewPlayerItemList;
