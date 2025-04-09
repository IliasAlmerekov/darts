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

function Podium({ ...props }: Props): JSX.Element {
  const { event } = useUser();
  if (!props.userMap || props.userMap.length === 0) {
    return <div className="podium" />;
  }
  return (
    <div className="podium">
      {props.userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRound =
          item.roundCount ??
          item.rounds[item.rounds.length - 1].throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length;

        const averageScore =
          item.scoreAverage ??
          Math.round((event.selectedPoints - item.score) / completedRound);

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
            averagePerRound={averageScore}
          />
        );
      })}
    </div>
  );
}
export default Podium;
