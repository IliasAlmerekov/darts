import '../GamePlayerItem/GamePlayerItem.css'


type Props = {
    name?: string;
    key?: number;
    isActive?: boolean;
    value?: number;
    throw1?: any;
    throw2?: any;
    throw3?: any;
    className: string

}


function GamePlayerItem({ ...props }: Props) {
    return (
        <div className={props.className} key={props?.key}>
            <div>
                <div>{props?.name}</div>
            </div>

            <div className='throws'>
                <div className='throwDisplay'>
                    <div className='divDisplay copylarge'>{props.throw1}</div>
                    <div className='divDisplay copylarge'>{props.throw2}</div>
                    <div className='divDisplay copylarge'>{props.throw3}</div>
                </div>

                <div className='pointer'>
                    <div className='scoreDisplay'>Score</div>
                    <div className='valueDisplay'>{props.value}</div>
                </div>
            </div>
        </div>
    )
}
export default GamePlayerItem