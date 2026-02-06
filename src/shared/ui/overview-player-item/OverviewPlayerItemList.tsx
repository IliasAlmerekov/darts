import OverviewPlayerItem from "./OverviewPlayerItem";

interface OverviewPlayerItemListProps {
  name?: string;
  userMap: BASIC.WinnerPlayerProps[];
  startScore?: number;
}

function OverviewPlayerItemList({
  userMap,
  startScore = 301,
}: OverviewPlayerItemListProps): JSX.Element {
  return (
    <>
      {userMap.map((item: BASIC.WinnerPlayerProps, index: number) => {
        const completedRounds =
          item.roundCount ??
          (item.rounds[item.rounds.length - 1]?.throw1 === undefined
            ? item.rounds.length - 1
            : item.rounds.length);

        const averageScore =
          item.scoreAverage ?? Math.round((startScore - item.score) / Math.max(completedRounds, 1));

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
