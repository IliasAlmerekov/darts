import '../GamePlayerItem/GamePlayerItem.css'
import FinishedGamePlayerItem from "./finishedGamePlayerItem";

type Props = {
    userMap?: any;
    name?: string;
    place?: any;
}

function FinishedGamePlayerItemList({ ...props }: Props) {
    //console.log(props.userMap.length)

    return props.userMap.length > 0 ?

        < div className="finishedPlayerList" >
            <div className="copylarge finishedplayers">Finished Players</div>
            {
                props.userMap.map((item: BASIC.PlayerProps) => (
                    <FinishedGamePlayerItem
                        name={item.name}
                        place={props.userMap.indexOf(item) + 1 + "."}
                    />
                ))
            }
        </div >

        :
        <></>
}
export default FinishedGamePlayerItemList