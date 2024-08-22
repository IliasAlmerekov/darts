import React from "react";
import { useState } from "react";
import './gamepage.css';
import NumberBoard from "../numberboard";
import { PlayerProps } from "../home";

type GameProps = {
    list: PlayerProps[],
}


function GamePage({ list }: GameProps) {
    const [rounds, setRounds] = useState(0)
    const [count, setCount] = useState(310)

    return (
        <><div className="Gamepage">
            <div className="Roundcounter">Rounds: {rounds}</div>
            <div className="box">  {list.map((item: PlayerProps) => {
                return <li id={item.id.toString()}> {item.name}</li>;
            })}
            </div>


        </div>
            <div className="Numberstyle">
                <NumberBoard />
            </div></>
    );
}
export default GamePage;