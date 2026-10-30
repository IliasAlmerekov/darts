import type React from "react";
import type { StandingsEntry } from "@/lib/game/finishedGameStandings";
import OverviewPlayerItem from "./OverviewPlayerItem";

const OVERVIEW_PLACEMENT_START = 4;

interface OverviewPlayerItemListProps {
  userMap: StandingsEntry[];
}

function OverviewPlayerItemList({ userMap }: OverviewPlayerItemListProps): React.JSX.Element {
  return (
    <>
      {userMap.map((item: StandingsEntry, index: number) => (
        <OverviewPlayerItem
          key={item.id}
          name={item.name}
          placement={index + OVERVIEW_PLACEMENT_START}
          rounds={item.rounds}
          threeDartAverage={item.threeDartAverage}
        />
      ))}
    </>
  );
}

export default OverviewPlayerItemList;
