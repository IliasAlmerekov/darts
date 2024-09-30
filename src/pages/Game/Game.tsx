import Keyboard from "../../components/Keyboard/Keyboard";
import "./game.css";
import Back from "../../icons/back.svg";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import { mockUserList } from "../../mockdata";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/Keyboard/NumberButton";

function Game() {
    const [playerScore, setPlayerScore] = useState(21);
    const [roundsCount, setRoundsCount] = useState(1);
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0);
    const [playerTurn, setPlayerTurn] = useState(0);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);

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
                isPlaying: true,
                isBust: false,
                throwCount: 0,
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
        const handleNewIndex = !playerList[newPlayerTurnIndex]?.isPlaying && !isEndOfArray ? newPlayerTurnIndex + 1 : isEndOfArray ? 0 : newPlayerTurnIndex;
        newPlayerList[handleNewIndex].isBust = false;
        //newPlayerList[handleNewIndex].prevScore = playerList[playerTurn].score
        newPlayerList[handleNewIndex].isActive = true;
        setPlayerList(newPlayerList);
        setPlayerTurn(handleNewIndex);
        setThrowCount(0);

        if (isEndOfArray) {
            setRoundsCount(roundsCount + 1);
            newPlayerList.forEach((player) => {
                return (player.rounds.push({
                    throw1: undefined,
                    throw2: undefined,
                    throw3: undefined,
                }))
            }
            );
        }
    }

    console.log(playerList[playerTurn])

    function handleThrow(
        player: BASIC.PlayerProps,
        currentThrow: number,
        currentScoreAchieved: number | any
    ) {
        setHistory([
            ...history,
            {
                playerList: JSON.parse(JSON.stringify(playerList)),
                playerScore,
                throwCount,
                playerTurn,
                roundsCount,
            },
        ]);
        const newScore = playerList[playerTurn].score - currentScoreAchieved;
        const currentPlayerThrows =
            playerList[playerTurn].rounds[playerList[playerTurn].rounds.length - 1];
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
            bust(playerScore)
        } else {
            playerList[playerTurn].score = newScore;
            setThrowCount(currentThrow + 1);
        }
        if (playerList[playerTurn].score === 0) {
            setIsOverlayOpen(true);
        }

        const updatedPlayerlist = [...playerList];
        updatedPlayerlist[playerTurn] = player;
        setPlayerList(updatedPlayerlist);
        playerList[playerTurn].throwCount = throwCount
    }

    function bust(bustedPlayerScore: number) {
        const currentRoundOfPlayer = playerList[playerTurn].rounds[roundsCount - 1];
        const firstThrow = currentRoundOfPlayer.throw1;
        const secondThrow = currentRoundOfPlayer.throw2;
        const thirdThrow = currentRoundOfPlayer.throw3;
        let oldThrowScore = playerList[playerTurn].score;
        playerList[playerTurn].isBust = true

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

    function handleFinishedPlayer() {
        setIsOverlayOpen(!isOverlayOpen);
        playerList[playerTurn].isPlaying = false;
        playerList[playerTurn].score = 1.;
        changeActivePlayer();
    }

    function handleUndo() {
        if (history.length > 0) {
            const lastState = history.pop();
            setPlayerList(lastState.playerList);
            setPlayerScore(lastState.playerScore);
            setThrowCount(lastState.throwCount);
            setPlayerTurn(lastState.playerTurn);
            setRoundsCount(lastState.roundsCount);
            setHistory([...history]);
        }
    }

    useEffect(() => {
        initializePlayerList();
    }, []);

    useEffect(() => {
        if (throwCount === 3 && !isOverlayOpen) {
            changeActivePlayer();
        }
    }, [throwCount]);

    if (playerList[playerTurn] === undefined) {
        return null;
    }

    return (
        <>
            <Overlay
                isOpen={isOverlayOpen}
                onClose={() => setIsOverlayOpen(!isOverlayOpen)}
            >
                <div className="finishGameOverlay">
                    <p className="copylarge">Continue Game?</p>
                    <div>
                        <Button
                            label="Finish"
                            handleClick={() => console.log("finish game")}
                            type="secondary"
                            isInverted={true}
                        />
                        <Button
                            label="Continue"
                            handleClick={() => { handleFinishedPlayer() }}
                            type="primary"
                        />
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
                    isBust={playerList[playerTurn].isBust}
                    throwCount={playerList[playerTurn].throwCount}
                />
            </div>
            <div>

                <NumberButton value="Undo" handleClick={handleUndo} />
                <Keyboard
                    handleClick={(value) =>
                        handleThrow(playerList[playerTurn], throwCount, value)

                    }
                />
            </div>

        </>
    );
}
export default Game;
