import clsx from "clsx";
import GamePlayerItem from "./GamePlayerItem"
import '../GamePlayerItem/GamePlayerItem.css'

type Props = {
    key?: number;
    isActive?: boolean;
    score: number;
    userMap: any;
    gamePlayerItemThrow1?: any;
    gamePlayerItemThrow2?: any;
    gamePlayerItemThrow3?: any;
    round: number
    isBust?: boolean;
    throwCount?: number;
    roundscount?: BASIC.Round
    gamePlayerItemPrevThrow1?: any
    gamePlayerItemPrevThrow2?: any
    gamePlayerItemPrevThrow3?: any
}

function GamePlayerItemList({ ...props }: Props) {
    return (
        <>
            {
                props.userMap.map((item: BASIC.PlayerProps) => (
                    <GamePlayerItem
                        classNameforName={clsx("playeritemName", {
                            "activePlayerItemName": item.isActive === true,
                        })}
                        className={clsx("gamePlayerItem", {
                            "activePlayer": item.isActive === true,
                            "winner": item.isPlaying === false
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
                            "playerid": item.isActive === true
                        })}
                    />
                ))
            }
        </>
    )
}
export default GamePlayerItemList