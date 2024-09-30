import '../GamePlayerItem/GamePlayerItem.css'
import X from '../../icons/delete-grey.svg'
import clsx from 'clsx';


type Props = {
    name?: string;
    key?: number;
    isActive?: boolean;
    value: number;
    throw1?: any;
    throw2?: any;
    throw3?: any;
    className: string
    src?: any;
    isBust?: boolean;
    throwCount?: number;
    isPlaying?: boolean;
    roundsCount: BASIC.Round[];
    prevthrow1: any
    prevthrow2: any
    prevthrow3: any
}

const bustIcon = <img src={X} alt="" />

function GamePlayerItem({ ...props }: Props) {
    //console.log(props.prevthrow1)
    //console.log(props.prevScore)
    //console.log(props.isBust)
    //console.log("throw: ", props.throwCount)
    //console.log(props.throw1, "+", props.throw2, "+", props.throw3, ">", props.prevScore)
    //console.log(props.prevthrow1, props.prevthrow2, props.prevthrow3)

    if (props.isBust && props.throwCount === 2) {
        console.log("bust on third throw")
        props.throw3 = props.throw3
        props.throw2 = props.throw2
        props.throw1 = props.throw1
    }

    else if (props.isBust && props.throwCount === 1) {
        props.throw3 = bustIcon
        console.log("bust on second throw")
    }

    else if (props.isBust && props.throwCount === 0) {
        props.throw2 = bustIcon
        props.throw3 = bustIcon
        console.log("bust on first throw")
    }

    else if (props.isActive && props.roundsCount?.length > 1) {
        props.prevthrow1 = undefined
        props.prevthrow2 = undefined
        props.prevthrow3 = undefined
    }

    console.log('props', props)
    return (
        <div className={props.className} key={props?.key}>
            <div>
                <div>{props?.name}</div>
            </div>

            <div className="throws">
                <div className={clsx("throwDisplay", {
                    "hidden": props.isPlaying === false
                })}>
                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            !props.isActive &&
                            props.throwCount === 0
                    })}>{props.throw1 !== undefined ? props.throw1 : props.prevthrow1 !== undefined ? props.prevthrow1 : undefined}</div>
                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            !props.isActive &&
                            props.throwCount === 1
                    })}>{props.throw2 !== undefined ? props.throw2 : props.prevthrow2 !== undefined ? props.prevthrow2 : undefined}</div>
                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            props.isBust &&
                            props.throwCount === 2
                    })}>{props.throw3 !== undefined ? props.throw3 : props.prevthrow3 !== undefined ? props.prevthrow3 : undefined}</div>
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