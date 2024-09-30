import clsx from "clsx";
import GamePlayerItem from "./GamePlayerItem"
import '../GamePlayerItem/GamePlayerItem.css'

type Props = {
    key?: number;
    isActive?: boolean;
    score: number;
    userMap: any;
    throw1?: any;
    throw2?: any;
    throw3?: any;
    round: number
    isBust?: boolean;
    throwCount?: number;
    roundscount?: BASIC.Round
    prevthrow1?: any
    prevthrow2?: any
    prevthrow3?: any
}

function GamePlayerItemList({ ...props }: Props) {
    return (
        <>
            {
                props.userMap.map((item: BASIC.PlayerProps) => (
                    <GamePlayerItem
                        className={clsx("gamePlayerItem", {
                            "activePlayer": item.isActive === true,
                            "winner": item.isPlaying === false
                        })}
                        {...item}
                        key={item.index}
                        name={item.name}
                        isActive={item.isActive}
                        value={item.score}
                        throw1={item.rounds[props.round - 1]?.throw1}
                        throw2={item.rounds[props.round - 1]?.throw2}
                        throw3={item.rounds[props.round - 1]?.throw3}
                        isBust={item.isBust}
                        throwCount={item.throwCount}
                        isPlaying={item.isPlaying}
                        roundsCount={item.rounds}
                        prevthrow1={item.rounds[props.round - 2]?.throw1}
                        prevthrow2={item.rounds[props.round - 2]?.throw2}
                        prevthrow3={item.rounds[props.round - 2]?.throw3}
                    />
                ))
            }
        </>
    )
}
export default GamePlayerItemList