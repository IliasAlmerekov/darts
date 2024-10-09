import Keyboard from "../../components/Keyboard/Keyboard";
import "./game.css";
import Back from "../../icons/back.svg";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/Keyboard/NumberButton";
import FinishedGamePlayerItemList from "../../components/GamePlayerItem/FinishedGamePlayerItemList";
import LinkButton from "../../components/LinkButton/LinkButton";
import Undo from '../../icons/undo-copy.svg'
import { PlayerProps } from "../start/start";

type Props = {
    list: PlayerProps[]
}

function Game(list: Props) {
    const [playerScore, setPlayerScore] = useState(21);
    const [roundsCount, setRoundsCount] = useState(1);
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0);
    const [playerTurn, setPlayerTurn] = useState(0);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [finishedPlayerList, setFinishedPlayerList] = useState<BASIC.PlayerProps[]>([])
    console.log("selectedplayelist", list)
    console.log(playerList)

    function initializePlayerList() {
        const initialPlayerlist: BASIC.PlayerProps[] = [];
        list.list.forEach((user: BASIC.UserProps, i: number) => {
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
        const handleNewIndex = isEndOfArray ? 0 : newPlayerTurnIndex;
        newPlayerList[handleNewIndex].isBust = false;
        newPlayerList[handleNewIndex].isActive = true;
        setPlayerList(newPlayerList);
        setPlayerTurn(handleNewIndex);
        setThrowCount(0);

        if (isEndOfArray) {
            setRoundsCount(roundsCount + 1);
            newPlayerList.forEach((player) => {
                return player.rounds.push({
                    throw1: undefined,
                    throw2: undefined,
                    throw3: undefined,
                });
            });
        }
    }

    function handleThrow(
        player: BASIC.PlayerProps,
        currentThrow: number,
        currentScoreAchieved: number | any
    ) {
        setHistory([
            ...history,
            {
                finishedPlayerList: JSON.parse(JSON.stringify(finishedPlayerList)),
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
            bust(playerScore);
        } else {
            playerList[playerTurn].score = newScore;
            setThrowCount(currentThrow + 1);
        }
        if (playerList[playerTurn].score === 0) {
            if (playerList.length === 2) {
                //route to finished page
            }
            else {
                setIsOverlayOpen(true);
            }
        }

        const updatedPlayerlist = [...playerList];
        updatedPlayerlist[playerTurn] = player;
        setPlayerList(updatedPlayerlist);
        playerList[playerTurn].throwCount = throwCount;
    }

    function bust(bustedPlayerScore: number) {
        const currentRoundOfPlayer = playerList[playerTurn].rounds[roundsCount - 1];
        const firstThrow = currentRoundOfPlayer.throw1;
        const secondThrow = currentRoundOfPlayer.throw2;
        const thirdThrow = currentRoundOfPlayer.throw3;
        let oldThrowScore = playerList[playerTurn].score;
        playerList[playerTurn].isBust = true;

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
        playerList[playerTurn].isPlaying = false;
        const finishedPlayer = playerList.filter((player) => player.isPlaying === false);
        let finishedPlayers = finishedPlayerList
        finishedPlayers.push(finishedPlayer[0])
        const unfinishedPlayers = playerList.filter((player) => player.isPlaying === true);
        changeActivePlayer()
        unfinishedPlayers[playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn].isActive = true
        setPlayerList(unfinishedPlayers)
        setFinishedPlayerList(finishedPlayers)
        setPlayerTurn(playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn)
    }


    function handleUndo() {
        if (history.length > 0) {
            const lastState = history.pop();
            setFinishedPlayerList(lastState.finishedPlayerList)
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

    return (
        <>
            <Overlay
                className="overlayBox"
                isOpen={isOverlayOpen}
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
                            handleClick={() => {
                                handleFinishedPlayer();
                                setIsOverlayOpen(!isOverlayOpen);
                            }}
                            type="primary"
                        />
                        <LinkButton
                            icon={Undo}
                            label="Undo Throw"
                            handleClick={() => {
                                setIsOverlayOpen(!isOverlayOpen)
                                handleUndo()
                            }}
                            className="undoThrow"
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
                    score={playerList[playerTurn]?.score}
                    round={roundsCount}
                    isBust={playerList[playerTurn]?.isBust}
                    throwCount={playerList[playerTurn]?.throwCount}
                />
                <FinishedGamePlayerItemList
                    userMap={finishedPlayerList} />
            </div>
            <div className="keyboard-and-undo">
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
