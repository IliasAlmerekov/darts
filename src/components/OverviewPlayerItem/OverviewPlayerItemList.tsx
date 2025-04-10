import React from "react";
import OverviewPlayerItem from "./OverviewPlayerItem";
import "./OverviewPlayerItem";
import { useUser } from "../../provider/UserProvider";

type Props = {
  name?: string;
  userMap: BASIC.WinnerPlayerProps[];
};

function OverviewPlayerItemList({ ...props }: Props): JSX.Element {
  const { event } = useUser();
  return (
    <>
      {props.userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRounds =
          (item.roundCount ??
          item.rounds[item.rounds.length - 1].throw1 === undefined)
            ? item.rounds.length - 1
            : item.rounds.length;

        const averageScore =
          item.scoreAverage ??
          Math.round((event.selectedPoints - item.score) / completedRounds);

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
