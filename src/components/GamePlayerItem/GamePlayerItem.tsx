import '../GamePlayerItem/GamePlayerItem.css'


type Props = {
    name?: string;
    key?: number;
    isActive?: boolean;
    value: number;
}


function GamePlayerItem({ ...props }: Props) {
    return (
        <div className="gamePlayerItem" key={props?.key}>
            <div>
                <div>{props?.name}</div>

            </div>

            <div className='results'>
                <div className='throwDisplay'>
                    <div className='divDisplay'></div>
                    <div className='divDisplay'></div>
                    <div className='divDisplay'></div>
                </div>

                <div className='score'>
                    Score {props.value}
                </div>
            </div>
        </div>
    )
}
export default GamePlayerItem