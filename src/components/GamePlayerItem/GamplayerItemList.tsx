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
}

function GamePlayerItemList({ ...props }: Props) {
    return (
        <>
            {
                props.userMap.map((item: BASIC.PlayerProps) => (
                    <GamePlayerItem
                        className={clsx("gamePlayerItem", { ["activePlayer"]: item.isActive === true })}
                        {...item}
                        key={item.index}
                        name={item.name}
                        isActive={props.isActive}
                        value={props.score}
                        throw1={props.throw1}
                        throw2={props.throw2}
                        throw3={props.throw3}
                    />
                ))
            }
        </>
    )
}
export default GamePlayerItemList