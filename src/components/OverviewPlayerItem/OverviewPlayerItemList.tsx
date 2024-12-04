import OverviewPlayerItem from "./OverviewPlayerItem";

type Props = {
  userMap: any;
};

function OverviewPlayerItemList({ ...props }: Props) {
  return (
    <>
      {props.userMap.map((item: BASIC.PlayerProps, index: number) => {
        const completedRounds =
          item.rounds[item.rounds.length - 1].throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length;

        const averageScore =
          completedRounds === 0
            ? 0
            : Math.round((301 - item.score) / completedRounds);

        return (
          <OverviewPlayerItem
            name={item.name}
            placement={index + 4}
            className="overviewPlayerItem"
            rounds={completedRounds}
            averagePerRound={averageScore}
          />
        );
      })}
    </>
  );
}
export default OverviewPlayerItemList;
