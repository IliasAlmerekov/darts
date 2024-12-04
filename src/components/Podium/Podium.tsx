import clsx from "clsx";
import PodiumPlayerCard from "../PodiumPlayerCard/PodiumPlayerCard";
import "./Podium.css";
import "../PodiumPlayerCard/PodiumPlayerCard.css";

type Props = {
  name?: string;
  userMap?: any;
  list?: any;
};

function Podium({ ...props }: Props) {
  return (
    <div className="podium">
      {props.userMap.map((item: BASIC.PlayerProps, index: number) => {
        const completedRound =
          item.rounds[item.rounds.length - 1].throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length;

        const averageScore =
          completedRound === 0
            ? 0
            : Math.round((301 - item.score) / completedRound);

        return (
          <PodiumPlayerCard
            className={clsx("podiumPlayerCard", {
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
