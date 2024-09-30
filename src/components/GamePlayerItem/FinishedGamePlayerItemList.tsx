import clsx from "clsx";
import GamePlayerItem from "./GamePlayerItem"
import '../GamePlayerItem/GamePlayerItem.css'
import FinishedGamePlayerItem from "./finishedGamePlayerItem";

type Props = {
    userMap?: any;
    name?: string;
    place?: any;
}

function FinishedGamePlayerItemList({ ...props }: Props) {
    return (

        <div className="finishedPlayerList">
            <div className="copylarge finishedplayers">Finished Players</div>
            {
                props.userMap.map((item: BASIC.PlayerProps) => (
                    <FinishedGamePlayerItem
                        name={item.name}
                        place={"1."}
                    />
                ))
            }
        </div>
    )
}
export default FinishedGamePlayerItemList