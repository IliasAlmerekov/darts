import Keyboard from "../../components/Keyboard/Keyboard";
import "./game.css";
import Back from "../../icons/back.svg";
import { Link, Navigate, redirect, useNavigate } from "react-router-dom";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/Keyboard/NumberButton";
import FinishedGamePlayerItemList from "../../components/GamePlayerItem/FinishedGamePlayerItemList";
import LinkButton from "../../components/LinkButton/LinkButton";
import Undo from '../../icons/undo-copy.svg'
import { PlayerProps } from "../Start/Start";

type Props = {
    players: PlayerProps[]
    setWinnerList: Dispatch<SetStateAction<BASIC.PlayerProps[]>>;
    undoFromSummary: boolean;
    setUndoFromSummary: Dispatch<SetStateAction<boolean>>
    setLastHistory: Dispatch<SetStateAction<any>>
    lastHistory: any;
}

function Game({ players, setWinnerList, undoFromSummary, setUndoFromSummary, setLastHistory, lastHistory }: Props) {
    const navigate = useNavigate();
    const [playerScore, setPlayerScore] = useState(301);
    const [roundsCount, setRoundsCount] = useState(1);
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0);
    const [playerTurn, setPlayerTurn] = useState(0);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [finishedPlayerList, setFinishedPlayerList] = useState<BASIC.PlayerProps[]>([])
    const [undoLastHistory, setUndoLastHistory] = useState(false)

    function initializePlayerList() {
        const initialPlayerlist: BASIC.PlayerProps[] = [];
        players.forEach((user: BASIC.UserProps, i: number) => {
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

    function playSound(path: string) {
        var audio = new Audio(path);
        audio.play();
        if (path === '/sounds/throw-sound.mp3') {
            audio.currentTime = 2.3;
        }
        else if (path === '/sounds/undo-sound.mp3') {
            audio.currentTime = 0.2
            audio.volume = 0.1
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
            playSound('/sounds/error-sound.mp3')
        } else {
            playerList[playerTurn].score = newScore;
            setThrowCount(currentThrow + 1);
            playSound('/sounds/throw-sound.mp3')
        }
        if (playerList[playerTurn].score === 0) {
            if (playerList.length === 2) {
                handleLastPlayer()
                return finishedPlayerList
            }
            else if (finishedPlayerList.length < 1) {
                setIsOverlayOpen(true);
                playSound('/sounds/win-sound.mp3')
            }
            else {
                handleFinishedPlayer()
                return playerList
            } setWinnerList(finishedPlayerList)
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
        const finishedPlayers = finishedPlayerList
        finishedPlayers.push(finishedPlayer[0])
        const unfinishedPlayers = playerList.filter((player) => player.isPlaying === true);
        changeActivePlayer()
        unfinishedPlayers[playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn].isActive = true
        setPlayerList(unfinishedPlayers)
        setFinishedPlayerList(finishedPlayers)
        setPlayerTurn(playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn)
        setWinnerList(finishedPlayerList)
    }

    function handleLastPlayer() {
        playerList[playerTurn].isPlaying = false;
        const newList = [...finishedPlayerList]
        const lastPlayer = playerList.filter(player => player.score !== 0)
        const secondlastPlayer = playerList.filter(player => player.score == 0)
        newList.push(secondlastPlayer[0], lastPlayer[0])
        setFinishedPlayerList(newList)
    }

    function sortPlayer() {
        const scoreArray: number[] = []
        playerList.forEach(player => {
            scoreArray.push(player.score)
        })

        allPlayersScoreSort(scoreArray)

        let i = 0
        const newList = [...finishedPlayerList]

        while (i < playerList.length) {

            playerList.forEach(player => {
                if (player.score === scoreArray[0]) {
                    scoreArray.splice(0, 1)
                    newList.push(player)
                }
            }
            )
            i += 1
        }
        setFinishedPlayerList(newList)
    }

    function allPlayersScoreSort(arr: number[]) {

        for (let i = 0; i < arr.length; i++) {

            for (let j = 0; j < (arr.length - i - 1); j++) {

                if (arr[j] > arr[j + 1]) {

                    let temp = arr[j]
                    arr[j] = arr[j + 1]
                    arr[j + 1] = temp
                }
            }
        }
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
            playSound('/sounds/undo-sound.mp3')
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

    useEffect(() => {
        if (finishedPlayerList.length === players.length) {
            setWinnerList(finishedPlayerList)
            setLastHistory(history)
            navigate("/summary");
            if (players.length === 2) {
                playSound('/sounds/win-sound.mp3')
            }
        }
    }, [finishedPlayerList.length, players.length]);

    useEffect(() => {
        if (playerTurn === 5) {
            const player = document.getElementById("playerid")
            player?.scrollIntoView({
                behavior: "smooth"
            })
        } else if (playerTurn + 1 === playerList.length) {
            const player = document.getElementById("playerid")
            player?.scrollIntoView({
                behavior: "smooth"
            })
        }
        else if (playerTurn === 0) {
            window.scroll({
                top: 0,
                behavior: "smooth"
            })
        }
    }, [playerTurn, playerList.length]);

    useEffect(() => {
        if (undoFromSummary === true) {
            setHistory(lastHistory)
            setUndoFromSummary(false)
            setUndoLastHistory(true)
        }
    }, [undoFromSummary]);

    useEffect(() => {
        if (undoLastHistory === true) {
            handleUndo()
            setUndoLastHistory(false)
        }
    }, [undoLastHistory]);

    return (
        <>
            <Overlay
                className="overlayBox"
                isOpen={isOverlayOpen}
            >
                <div className="finishGameOverlay">
                    <p className="overlayHeading">Continue Game?</p>
                    <div>
                        <Button
                            label="Finish"
                            isLink
                            handleClick={() => sortPlayer()}
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
            <div className="gamePageHeader">
                <Link to="/" className="top">
                    <img src={Back} alt="" />

                </Link>
            </div>
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
                    isOverlayOpen={isOverlayOpen}
                />

            </div>
        </>
    );
}
export default Game;
