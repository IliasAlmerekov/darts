import Keyboard from "../../components/Keyboard/Keyboard";
import './game.css'
import Back from '../../icons/back.svg'
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import { mockUserList } from "../../mockdata";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";

function Game() {
    const [playerScore, setPlayerScore] = useState(20)
    const [roundsCount, setRoundsCount] = useState(1);
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0);
    const [playerTurn, setPlayerTurn] = useState(0);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)

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

    function handleThrow(player: BASIC.PlayerProps, currentThrow: number, currentScoreAchieved: number | any) {
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

        if (currentScoreAchieved > playerList[playerTurn].score) {
            bust(playerScore);
        } else {
            playerList[playerTurn].score = newScore;
            setThrowCount(currentThrow + 1);
        }
        if (playerList[playerTurn].score === 0) {
            playerList[playerTurn].isPlaying = false
            setIsOverlayOpen(true)
        }
        if (playerList[playerTurn].isPlaying === false) {
            console.log("winner:", playerList[playerTurn].name)
        }

        const updatedPlayerlist = [...playerList];
        updatedPlayerlist[playerTurn] = player;
        setPlayerList(updatedPlayerlist);
    }

    function bust(bustedPlayerScore: number) {
        const currentRoundOfPlayer = playerList[playerTurn].rounds[roundsCount - 1];
        const firstThrow = currentRoundOfPlayer.throw1;
        const secondThrow = currentRoundOfPlayer.throw2;
        const thirdThrow = currentRoundOfPlayer.throw3;
        let oldThrowScore = playerList[playerTurn].score;

        if (thirdThrow) {
            let firstAndSecondThrowScore = 0;
            if (firstThrow !== undefined && secondThrow !== undefined) {
                firstAndSecondThrowScore = firstThrow + secondThrow;
            }
            oldThrowScore = firstAndSecondThrowScore + bustedPlayerScore;
        } else if (
            firstThrow !== undefined &&
            secondThrow !== undefined &&
            secondThrow > playerList[playerTurn].score
        ) {
            oldThrowScore = firstThrow + bustedPlayerScore;
        }

        playerList[playerTurn].score = oldThrowScore;
        changeActivePlayer();
    }

    useEffect(() => {
        initializePlayerList();
    }, []);

    useEffect(() => {
        if (throwCount === 3) {
            changeActivePlayer();
        }
    }, [throwCount]);

    if (playerList[playerTurn] === undefined) {
        return null
    }

    return (
        <>  <Overlay
            isOpen={isOverlayOpen}
            onClose={() => setIsOverlayOpen(!isOverlayOpen)}
        >
            <div className="finishGameOverlay">
                <p className="copylarge">Continue Game?</p>
                <div>
                    <Button
                        label='Finish'
                        handleClick={() => console.log("finish game")}
                        type="secondary"
                        isInverted={true}
                    />
                    <Button
                        label='Continue'
                        handleClick={() => {
                            setIsOverlayOpen(!isOverlayOpen)
                            changeActivePlayer()
                        }}
                        type="primary" />
                </div>
            </div>

        </Overlay>

            <Link to="/" className="top">
                <img src={Back} alt="" />
            </Link>
            <div className="gamePlayerItemContainer">
                <GamePlayerItemList
                    userMap={playerList}
                    score={playerList[playerTurn].score}
                    round={roundsCount}
                />
            </div>
            <Keyboard handleClick={(value) => handleThrow(playerList[playerTurn], throwCount, value)} />
            <button onClick={changeActivePlayer}>{throwCount}</button>

        </>
    )
}
export default Game; 