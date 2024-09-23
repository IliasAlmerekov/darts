import Keyboard from "../../components/Keyboard/Keyboard";
import './game.css'
import Back from '../../icons/back.svg'
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import { mockUserList } from "../../mockdata";

function Game() {
    const [playerScore, setPlayerScore] = useState(301)
    const [roundsCount, setRoundsCount] = useState(1);
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0);
    const [playerTurn, setPlayerTurn] = useState(0);

    function initializePlayerList() {
        const initialPlayerlist: BASIC.PlayerProps[] = [];
        mockUserList.forEach((user: BASIC.UserProps, i) => {
            const player = {
                id: user.id,
                name: user.name,
                score: playerScore,
                isActive: i === 0 ? true : false,
                index: i,
                rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
                isPlaying: true
            };
            initialPlayerlist.push(player);
        });
        setPlayerList(initialPlayerlist);
    }

    function changeActivePlayer() {
        const prevPlayerTurnIndex = playerTurn;
        const newPlayerTurnIndex = playerTurn + 1;
        const newPlayerList: BASIC.PlayerProps[] = [...playerList];

        newPlayerList[prevPlayerTurnIndex].isActive = false;
        const isEndOfArray = newPlayerTurnIndex > newPlayerList.length - 1;
        const handleNewIndex = isEndOfArray ? 0 : newPlayerTurnIndex;
        newPlayerList[handleNewIndex].isActive = true;
        setPlayerList(newPlayerList);
        setPlayerTurn(handleNewIndex);
        setThrowCount(0);

        if (isEndOfArray) {
            setRoundsCount(roundsCount + 1);
            newPlayerList.forEach(player => player.rounds.push({ throw1: undefined, throw2: undefined, throw3: undefined }))
        }
    }

    function handleThrow(currentThrow: number, currentScoreAchieved: number) {
        const newScore = playerList[playerTurn].score - currentScoreAchieved;
        const currentPlayerThrows = playerList[playerTurn].rounds[playerList[playerTurn].rounds.length - 1];
        switch (currentThrow) {
            case 0:
                currentPlayerThrows.throw1 = currentScoreAchieved as unknown as number;
                break;
            case 1:
                currentPlayerThrows.throw2 = currentScoreAchieved as unknown as number;
                break;
            case 2:
                currentPlayerThrows.throw3 = currentScoreAchieved as unknown as number;
                break;
            default:
        }
        setPlayerScore(newScore);

        setPlayerScore(playerScore - currentScoreAchieved)
        console.log(playerList[playerTurn].rounds)
        setThrowCount(throwCount + 1)
    }

    useEffect(() => {
        initializePlayerList();
    }, []);

    useEffect(() => {
        if (throwCount === 3) {
            changeActivePlayer();
        }
    }, [throwCount]);

    return (
        <>
            <Link to="/" className="top">
                <img src={Back} alt="" />
            </Link>
            <div className="gamePlayerItemContainer">
                <GamePlayerItemList
                    userMap={playerList}
                    score={playerScore}
                    throw1={1}
                    throw2={2}
                    throw3={3} //playerList[playerTurn].rounds[roundsCount].throw3
                />
            </div>
            <Keyboard handleClick={(value) => handleThrow(throwCount, value)} />

            <button onClick={changeActivePlayer}>{throwCount}</button>
        </>
    )
}
export default Game; 