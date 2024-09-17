import { isJsxElement } from 'typescript'
import './Keyboard.css'
import clsx from 'clsx'



function NumberButton({ value }: any) {
    return (
        <button className={clsx("button", {
            ["Undo"]: value === "<=",
            ["Triple"]: value === "Triple",
            ["Double"]: value === "Double",


        })}>{value}</button>
    )
}
export default NumberButton