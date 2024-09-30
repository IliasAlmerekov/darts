import './GamePlayerItem.css'

type Props = {
    name?: string;
    place?: any;
}

function FinishedGamePlayerItem({ ...props }: Props) {
    return (
        <div className="gamePlayerItem finished">
            <div>
                <div>{props?.name}</div>
            </div>

            <div className='place'>{props.place}</div>
        </div>
    )
}
export default FinishedGamePlayerItem