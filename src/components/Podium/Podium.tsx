import clsx from "clsx";
import PodiumPlayerCard from "../PodiumPlayerCard/PodiumPlayerCard";
import "./Podium.css";
import "../PodiumPlayerCard/PodiumPlayerCard.css";
import React from "react";
import { useUser } from "../../provider/UserProvider";

type Props = {
  name?: string;
  userMap?: BASIC.WinnerPlayerProps[];
  list?: BASIC.WinnerPlayerProps[];
};

function Podium({ ...props }: Props): React.JSX.Element {
  const { event } = useUser();
  if (!props.userMap || props.userMap.length === 0) {
    return <div className="podium" />;
  }
  return (
    <div className="podium">
      {props.userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRound =
          item.roundCount ??
          (item.rounds[item.rounds.length - 1]?.throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length);

        const averageScoreRaw =
          completedRound > 0
            ? (item.scoreAverage ?? (event.selectedPoints - item.score) / completedRound)
            : 0;
        const averagePerRound = completedRound > 0 ? averageScoreRaw.toFixed(2) : (0).toFixed(2);

        return (
          <PodiumPlayerCard
            key={index}
            className={clsx("podium-player-card", {
              first: index === 0,
              second: index === 1,
              third: index === 2,
              hide: props.list?.length === 2 && index === 2,
            })}
            rounds={completedRound}
            name={item.name}
            placement={index + 1 + "."}
            averagePerRound={averagePerRound}
          />
        );
      })}
    </div>
  );
}
export default Podium;
