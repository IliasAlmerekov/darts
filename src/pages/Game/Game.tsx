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
import FinishedGamePlayerItemList from "../../components/GamePlayerItem/FinishedGamePlayerItemList";
import LinkButton from "../../components/LinkButton/LinkButton";
import Undo from '../../icons/undo-copy.svg'

function Game() {
    const [playerScore, setPlayerScore] = useState(21);
    const [roundsCount, setRoundsCount] = useState(1);
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0);
    const [playerTurn, setPlayerTurn] = useState(0);
    const [isOverlayOpen, setIsOverlayOpen] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [finishedPlayerList, setFinishedPlayerList] = useState<BASIC.PlayerProps[]>([])
    const [unfinishedPlayerList, setUnfinishedPlayerList] = useState<BASIC.PlayerProps[]>([])

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
        let checkedPlayers = playerList
        checkedPlayers = unfinishedPlayerList.length > 0 ? checkedPlayers.filter(player => unfinishedPlayerList.includes(player)) : playerList
        setHistory([
            ...history,
            {
                playerList: JSON.parse(JSON.stringify(checkedPlayers)),
                playerScore,
                throwCount,
                playerTurn,
                roundsCount,
            },
        ]);
        //console.log('checkedPlayers[playerTurn] - playerturn', playerTurn)
        //console.log('checkedPlayers[playerTurn] - checkedPlayers', checkedPlayers)
        const newScore = checkedPlayers[playerTurn].score - currentScoreAchieved;
        const currentPlayerThrows =
            checkedPlayers[playerTurn].rounds[checkedPlayers[playerTurn].rounds.length - 1];
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

        if (currentScoreAchieved > checkedPlayers[playerTurn].score) {
            bust(playerScore);
        } else {
            checkedPlayers[playerTurn].score = newScore;
            setThrowCount(currentThrow + 1);
        }
        if (checkedPlayers[playerTurn].score === 0) {
            setIsOverlayOpen(true);
        }

        const updatedPlayerlist = [...checkedPlayers];
        updatedPlayerlist[playerTurn] = player;
        setPlayerList(updatedPlayerlist);
        checkedPlayers[playerTurn].throwCount = throwCount;
        console.log(roundsCount)
        console.log(updatedPlayerlist)
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

        unfinishedPlayers[playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn].isActive = true
        setUnfinishedPlayerList(unfinishedPlayers)
        setPlayerList(unfinishedPlayers)
        setFinishedPlayerList(finishedPlayers)
        setPlayerTurn(playerTurn > unfinishedPlayers.length - 1 ? 0 : playerTurn)
        setThrowCount(0)
        if (playerTurn + 1 > unfinishedPlayers.length - 1) {
            changeActivePlayer()
            const unfinishedPlayers = playerList.filter((player) => player.isPlaying === true);
            setPlayerList(unfinishedPlayers)
        }
        setIsOverlayOpen(!isOverlayOpen);
    }
    //if the last player wins and you undo throws from the first person after that, checkedPlayers[playerTurn] is undefined (only if a player wins) ln89
    //if a player that is not the last player wins, the throws from the player after it should be empty. 
    //if a player wins it is still in the playerlist(checkedplayers) until the next player turn??
    //if the second last player wins we cant go into a next round / also the last player cant win or throw

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

    return (
        <>
            <Overlay
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
