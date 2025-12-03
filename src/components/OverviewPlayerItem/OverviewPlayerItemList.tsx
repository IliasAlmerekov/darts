import OverviewPlayerItem from "./OverviewPlayerItem";
import "./OverviewPlayerItem";
import { useStore } from "@nanostores/react";
import { $settings } from "../../stores";

interface OverviewPlayerItemListProps {
  name?: string;
  userMap: BASIC.WinnerPlayerProps[];
}

function OverviewPlayerItemList({ userMap }: OverviewPlayerItemListProps): JSX.Element {
  const settings = useStore($settings);

  return (
    <>
      {userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRounds =
          item.roundCount ??
          (item.rounds[item.rounds.length - 1]?.throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length);

        const averageScore =
          item.scoreAverage ??
          Math.round((settings.points - item.score) / Math.max(completedRounds, 1));

        return (
          <OverviewPlayerItem
            key={item.id}
            name={item.name}
            placement={index + 4}
            className="overview-player-item"
            rounds={completedRounds}
            averagePerRound={averageScore}
          />
        );
      })}
    </>
  );
}

export default OverviewPlayerItemList;
