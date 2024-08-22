import React, { useState } from "react";
import './numberboard.css';



function NumberBoard() {
    function Square(props: any) {
        return <button className="btn" onClick={HandleClick}>{props.name}</button>
    }

    function HandleClick() {
        const [count, setCount] = useState(310)
        setCount(count - 1);
    }

    return (
        <><div className="Numberboard">
            <Square name="1" />
            <Square name="2" />
            <Square name="3" />
            <Square name="4" />
            <Square name="5" />
            <Square name="6" />
            <Square name="7" />
            <Square name="8" />
        </div>
            <div className="Numberboard">
                <Square name="9" />
                <Square name="10" />
                <Square name="11" />
                <Square name="12" />
                <Square name="13" />
                <Square name="14" />
                <Square name="15" />
                <Square name="16" />

            </div>
            <div className="Numberboard">
                <Square name="17" />
                <Square name="18" />
                <Square name="19" />
                <Square name="20" />
                <Square name="25" />
                <Square name="50" />
                <Square name="0" />
                <Square name="<" />
            </div>
            <div className="Numberboard">
                <button className="specialButton">Double</button>
                <button className="specialButton">Triple</button>

            </div>
        </>
    )
}
export default NumberBoard