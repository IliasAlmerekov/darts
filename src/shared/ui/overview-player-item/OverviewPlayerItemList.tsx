import type { WinnerPlayerProps } from "@/types";
import { formatRoundAverage, getCompletedRounds } from "@/shared/lib/roundAverage";
import OverviewPlayerItem from "./OverviewPlayerItem";

interface OverviewPlayerItemListProps {
  name?: string;
  userMap: WinnerPlayerProps[];
  startScore?: number;
}

function OverviewPlayerItemList({
  userMap,
  startScore = 301,
}: OverviewPlayerItemListProps): JSX.Element {
  return (
    <>
      {userMap.map((item: WinnerPlayerProps, index: number) => {
        const completedRounds = getCompletedRounds(item);
        const averageScore = formatRoundAverage(item, startScore);

        return (
          <OverviewPlayerItem
            key={item.id}
            name={item.name}
            placement={index + 4}
            rounds={completedRounds}
            averagePerRound={averageScore}
          />
        );
      })}
    </>
  );
}

export default OverviewPlayerItemList;
