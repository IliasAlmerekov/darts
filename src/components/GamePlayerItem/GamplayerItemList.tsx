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
}

function GamePlayerItemList({ ...props }: Props) {
    return (
        <>
            {
                props.userMap.map((item: BASIC.PlayerProps) => (
                    <GamePlayerItem
                        className={clsx("gamePlayerItem", { "activePlayer": item.isActive === true })}
                        {...item}
                        key={item.index}
                        name={item.name}
                        isActive={item.isActive}
                        value={item.score}
                        throw1={item.rounds[props.round - 1].throw1}
                        throw2={item.rounds[props.round - 1].throw2}
                        throw3={item.rounds[props.round - 1].throw3}
                    />
                ))
            }
        </>
    )
}
export default GamePlayerItemList