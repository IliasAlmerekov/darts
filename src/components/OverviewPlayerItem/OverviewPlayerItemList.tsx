import OverviewPlayerItem from "./OverviewPlayerItem";
import React from "react";

type Props = {
  name?: string;
  userMap: BASIC.WinnerPlayerProps[];
};

function OverviewPlayerItemList({ ...props }: Props): JSX.Element {
  return (
    <>
      {props.userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRounds = item.roundCount;

        const averageScore = item.scoreAverage;

        return (
          <OverviewPlayerItem
            key={item.index}
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
