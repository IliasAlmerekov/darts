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
    prevScore: any
}


function GamePlayerItem({ ...props }: Props) {
    //console.log(props.isBust)
    //console.log("throw: ", props.throwCount)
    if (props.isBust && props.throwCount === 2) {
        console.log("bust on third throw")
        props.throw3 = props.throw3
        props.throw2 = props.throw2
        props.throw1 = props.throw1
    }

    else if (props.isBust && props.throwCount === 1) {
        props.throw3 = <img src={X} alt="" />
        console.log("bust on second throw")
    }

    else if (props.isBust && props.throwCount === 0) {
        props.throw2 = <img src={X} alt="" />
        props.throw3 = <img src={X} alt="" />
        console.log("bust on first throw")
    }

    /* else if (props.roundsCount?.length > 1 && !props.isActive) {
        props.throw3 = props.prevthrow3 || 0
        props.throw2 = props.prevthrow2 || 0
        props.throw1 = props.prevthrow1 || 0
    } */


    else if (props.roundsCount?.length > 1 && !props.isActive &&
        props.throw1 === undefined &&
        props.throw2 === undefined &&
        props.throw3 === undefined) { //not working because its changing the 0 with x
        props.throw3 = props.prevthrow3 || <img src={X} alt="" />
        props.throw2 = props.prevthrow2 || <img src={X} alt="" />
        props.throw1 = props.prevthrow1 || <img src={X} alt="" />
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
                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            props.isActive === false &&
                            props.throwCount === 0
                    })}>{props.throw1}</div>
                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            props.isActive === false &&
                            props.throwCount === 1
                    })}>{props.throw2}</div>
                    <div className={clsx("divDisplay copylarge", {
                        "bust":
                            (props.throw1 + props.throw2 + props.throw3) > props.value && // not working because its checking the value afterwards when not bust 3/4/5
                            props.throwCount === 2
                    })}>{props.throw3}</div>
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