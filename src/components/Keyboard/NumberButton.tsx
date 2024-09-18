import './Keyboard.css'
import clsx from 'clsx'

type Props = {
    value: any
    handleClick: () => void
}

function NumberButton({ ...props }: Props) {
    return (
        <button onClick={props.handleClick} className={clsx("button", {
            ["Undo"]: props.value === "<=",
            ["Triple"]: props.value === "Triple",
            ["Double"]: props.value === "Double",


        })}>{props.value}</button>
    )
}
export default NumberButton