import './Keyboard.css'
import clsx from 'clsx'
import Undo from '../../icons/undo.svg'

type Props = {
    value: any
    handleClick: () => void
}

function NumberButton({ ...props }: Props) {
    return (
        <button onClick={props.handleClick} className={clsx("button copylarge", {
            ["undo"]: props.value === "Undo",
            ["triple"]: props.value === "Triple",
            ["double"]: props.value === "Double",


        })}>{props.value === "Undo" ? <img src={Undo} /> : props.value}</button>
    )
}
export default NumberButton