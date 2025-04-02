import clsx from "clsx";
import GamePlayerItem from "./GamePlayerItem";
import "../GamePlayerItem/GamePlayerItem.css";
import React from "react";

type Props = {
  key?: number;
  isActive?: boolean;
  score: number;
  userMap: BASIC.WinnerPlayerProps[];
  gamePlayerItemThrow1?: BASIC.Round;
  gamePlayerItemThrow2?: BASIC.Round;
  gamePlayerItemThrow3?: BASIC.Round;
  round: number;
  isBust?: boolean;
  throwCount?: number;
  roundscount?: BASIC.Round;
  gamePlayerItemPrevThrow1?: BASIC.Round;
  gamePlayerItemPrevThrow2?: BASIC.Round;
  gamePlayerItemPrevThrow3?: BASIC.Round;
};

function GamePlayerItemList({ ...props }: Props) {
  return (
    <>
      {props.userMap.map((item: BASIC.WinnerPlayerProps) => (
        <GamePlayerItem
          classNameforName={clsx("playeritemName", {
            activePlayerItemName: item.isActive === true,
          })}
          className={clsx("gamePlayerItem", {
            activePlayer: item.isActive === true,
            winner: item.isPlaying === false,
          })}
          {...item}
          key={item.index}
          name={item.name}
          isActive={item.isActive}
          value={item.score}
          gamePlayerItemThrow1={item.rounds[props.round - 1]?.throw1}
          gamePlayerItemThrow2={item.rounds[props.round - 1]?.throw2}
          gamePlayerItemThrow3={item.rounds[props.round - 1]?.throw3}
          isBust={item.isBust}
          throwCount={item.throwCount}
          isPlaying={item.isPlaying}
          roundsCount={item.rounds}
          gamePlayerItemPrevThrow1={item.rounds[props.round - 2]?.throw1}
          gamePlayerItemPrevThrow2={item.rounds[props.round - 2]?.throw2}
          gamePlayerItemPrevThrow3={item.rounds[props.round - 2]?.throw3}
          id={clsx("", {
            playerid: item.isActive === true,
          })}
        />
      ))}
    </>
  );
}
export default GamePlayerItemList;
