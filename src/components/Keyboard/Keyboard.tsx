import React, { useState } from "react";
import "../Keyboard/Keyboard.css";
import NumberButton from "./NumberButton";

type Props = {
    handleClick: (value: any) => void;
    disabled?: boolean
};

function Keyboard({ ...props }: Props) {
    const [doubleNext, setDoubleNext] = useState(false);
    const [tripleNext, setTripleNext] = useState(false);

    const btnValues = [
        [1, 2, 3, 4, 5, "Double", 6, 7, 8],
        [9, 10, "Triple", 11, 12, 13, 14, 15, 16],
        [17, 18, 19, 20, 25, 0],
    ];

    const handleButtonClick = (btn: any) => {
        if (btn === "Double") {
            setDoubleNext(!doubleNext);
            setTripleNext(false);
        } else if (btn === "Triple") {
            setTripleNext(!tripleNext);
            setDoubleNext(false);
            props.disabled = true;
        } else {
            if (doubleNext && typeof btn === "number") {
                props.handleClick(btn * 2);
                setDoubleNext(false);
            } else if (tripleNext && typeof btn === "number") {
                props.handleClick(btn * 3);
                setTripleNext(false);
            } else {
                props.handleClick(btn);
            }
        }
    };

    return (

        <div className="keyboard">
            {btnValues.flat().map((btn, i) => (
                <NumberButton
                    handleClick={() => handleButtonClick(btn)}
                    value={btn}
                    key={i}
                    isActive={
                        (doubleNext && btn === "Double") ||
                        (tripleNext && btn === "Triple")
                    }
                    disabled={
                        (tripleNext && btn === 25)
                    }
                />
            ))}
        </div>

    );
}

export default Keyboard;
