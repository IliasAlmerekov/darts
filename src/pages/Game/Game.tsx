import GamePlayerItem from "../../components/GamePlayerItem/GamePlayerItem";
import Keyboard from "../../components/Keyboard/Keyboard";
import '../Game/game.css'
import Back from '../../icons/back.svg'
import { Link } from "react-router-dom";
import { useState } from "react";

function Game() {
    const [points, setPoints] = useState(301)

    function handleThrow(value: any) {
        setPoints(points - value)
        console.log(value)
    }

    return (
        <>
            <Link to="/" className="top">
                <img src={Back} alt="" />
            </Link>
            <div className="gamePlayerItemContainer">
                <GamePlayerItem value={points} name="Max" />
            </div>
            <Keyboard handleClick={(value) => handleThrow(value)} />
        </>
    )
}
export default Game; 