import clsx from "clsx";
import GamePlayerItem from "./GamePlayerItem";
import "./GamePlayerItem.css";

interface GamePlayerItemListProps {
  isActive?: boolean;
  score: number;
  userMap: BASIC.WinnerPlayerProps[];
  round: number;
  isBust?: boolean;
  throwCount?: number;
  roundscount?: BASIC.Round;
}

function GamePlayerItemList({ userMap, round }: GamePlayerItemListProps): JSX.Element {
  return (
    <>
      {userMap.map((item: BASIC.WinnerPlayerProps) => {
        const currentRound = item.rounds[round - 1];
        const previousRound = item.rounds[round - 2];

        return (
          <GamePlayerItem
            className={clsx("game-player-item", {
              "active-player": item.isActive === true,
              winner: item.isPlaying === false,
            })}
            key={item.id}
            name={item.name}
            isActive={item.isActive}
            value={item.score}
            gamePlayerItemThrow1={currentRound?.throw1}
            gamePlayerItemThrow2={currentRound?.throw2}
            gamePlayerItemThrow3={currentRound?.throw3}
            isBust={item.isBust}
            throwCount={item.throwCount}
            isPlaying={item.isPlaying}
            roundsCount={item.rounds}
            gamePlayerItemPrevThrow1={previousRound?.throw1}
            gamePlayerItemPrevThrow2={previousRound?.throw2}
            gamePlayerItemPrevThrow3={previousRound?.throw3}
            id={item.isActive ? "playerid" : ""}
          />
        );
      })}
    </>
  );
}

export default GamePlayerItemList;
