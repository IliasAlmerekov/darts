import OverviewPlayerItemList from "../../components/OverviewPlayerItem/OverviewPlayerItemList"
import './gamesummary.css'
import Button from "../../components/Button/Button";
import Podium from "../../components/Podium/Podium";
import Undo from '../../icons/undolinkbutton.svg'
import { Link } from "react-router-dom";
import { Dispatch, SetStateAction } from "react";

type Props = {
    list: BASIC.PlayerProps[]
    setUndo: Dispatch<SetStateAction<boolean>>
}

function Gamesummary({ list, setUndo }: Props) {
    const newList = [...list]
    const podiumList = newList.slice(0, 3)
    const leaderboarList = newList.slice(3, list.length + 1)
    const podiumListWithPlaceholder = [...podiumList]
    podiumListWithPlaceholder.push({
        id: 0,
        name: "-",
        score: 0,
        isActive: false,
        index: 0,
        rounds: [
            { throw1: undefined, throw2: undefined, throw3: undefined }
        ]
    })

    return (
        <div className="summary">
            <div>
                <Link to="/game" className="undoButton">
                    <img src={Undo} alt="" onClick={() => setUndo(true)} />

                </Link>
            </div>
            <Podium
                userMap={(podiumList.length === 2 ? podiumListWithPlaceholder : podiumList)}
                list={list}
            />
            <div className="leaderBoard">
                <OverviewPlayerItemList
                    userMap={leaderboarList} />
            </div>

            <div className="playAgainButton">
                <Button
                    isLink
                    link={"/game"}
                    label="Play Again"
                    type="primary"
                    isInverted
                    className="playAgainButton"
                />
            </div>
            <div className="backToStartButton">
                <Button
                    className="backToStartButton"
                    link={"/"}
                    isLink
                    label="Back To Start"
                    type="primary"

                />
            </div>

        </div >
    )
}
export default Gamesummary