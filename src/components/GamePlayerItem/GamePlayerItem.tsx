import '../GamePlayerItem/GamePlayerItem.css'
import X from '../../icons/delete-grey.svg'
import clsx from 'clsx';


type Props = {
    name?: string;
    key?: number;
    isActive?: boolean;
    value: number;
    gamePlayerItemThrow1?: any;
    gamePlayerItemThrow2?: any;
    gamePlayerItemThrow3?: any;
    className: string
    src?: any;
    isBust?: boolean;
    throwCount?: number;
    isPlaying?: boolean;
    roundsCount: BASIC.Round[];
    gamePlayerItemPrevThrow1: any
    gamePlayerItemPrevThrow2: any
    gamePlayerItemPrevThrow3: any
}

const bustIcon = <img src={X} alt="" />

function GamePlayerItem({ ...props }: Props) {
    function handlePoint(currentThrow?: number, prevThrow?: number): number | undefined {
        return currentThrow !== undefined ? currentThrow :
            prevThrow !== undefined ? prevThrow : undefined


    }

    if (props.isBust && props.throwCount === 1) {
        props.gamePlayerItemThrow3 = bustIcon
    }

    else if (props.isBust && props.throwCount === 0) {
        props.gamePlayerItemThrow2 = bustIcon
        props.gamePlayerItemThrow3 = bustIcon
    }

    else if (props.isActive && props.roundsCount?.length > 1) {
        props.gamePlayerItemPrevThrow1 = undefined
        props.gamePlayerItemPrevThrow2 = undefined
        props.gamePlayerItemPrevThrow3 = undefined
    }

    return (
        <div className={props.className} key={props?.key}>
            <div>
                <div>{props?.name}</div>
            </div>

            <div className="throws">
                <div className={clsx("throwDisplay", {
                    "hidden": props.isPlaying === false
                })}>

                    <div className=
                        {clsx("divDisplay copylarge", {
                            "bust":
                                !props.isActive &&
                                props.throwCount === 0
                        })}>
                        {
                            handlePoint(props.gamePlayerItemThrow1, props.gamePlayerItemPrevThrow1)
                        }
                    </div>

                    <div className=
                        {clsx("divDisplay copylarge", {
                            "bust":
                                !props.isActive &&
                                props.throwCount === 1
                        })}>
                        {
                            handlePoint(props.gamePlayerItemThrow2, props.gamePlayerItemPrevThrow2)
                        }
                    </div>

                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            props.isBust &&
                            props.throwCount === 2
                    })}>
                        {
                            handlePoint(props.gamePlayerItemThrow3, props.gamePlayerItemPrevThrow3)
                        }
                    </div>
                </div>

                <div className='pointer'>
                    <div className={clsx("scoreDisplay", {
                        "hidden": props.isPlaying === false
                    })}>Score</div>
                    <div className='valueDisplay'>{props.value}</div>
                </div>
            </div>
        </div>
    )
}
export default GamePlayerItem