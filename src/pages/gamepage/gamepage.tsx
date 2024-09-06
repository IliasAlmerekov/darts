import { useState, useEffect } from "react";
import "./gamepage.css";
import Player from "../../components/Player";
import { Link } from "react-router-dom";
import { mockUserList } from "../../mockdata";

function GamePage({ userList }: BASIC.UserList) {
    const [playerScore, setPlayerScore] = useState(15); // change after testing to 301
    const [roundsCount, setRoundsCount] = useState(1); //Rundenanzeige
    const [playerList, setPlayerList] = useState<BASIC.PlayerProps[]>([]);
    const [throwCount, setThrowCount] = useState(0); // zählt wie oft geworfen wurde
    const [playerTurn, setPlayerTurn] = useState(0); // index of player
    const [modal, setModal] = useState(false)
    const keyboardNumbers: { rows: number[][] } = {
        rows: [
            [1, 2, 3, 4, 5, 6, 7, 8],
            [9, 10, 11, 12, 13, 14, 15, 16],
            [17, 18, 19, 20, 25, 0,],
        ],
    };
    const toggleModal = () => {
        setModal(!modal)
    }



    function initializePlayerList() {
        // GOOD
        const initialPlayerlist: BASIC.PlayerProps[] = [];
        mockUserList.forEach((user: BASIC.UserProps, i) => {
            const player = {
                id: user.id,
                name: user.name,
                score: playerScore,
                isActive: i === 0 ? true : false, // initial active player with first index for styling
                index: i,
                rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
                isPlaying: true
                //displayThrows: [], -> DELETE?
            };
            initialPlayerlist.push(player);
        });

        setPlayerList(initialPlayerlist);
    }

    function changeActivePlayer() {
        // GOOD
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
            //newPlayerList[handleNewIndex].rounds.push({ throw1: undefined, throw2: undefined, throw3: undefined });
            newPlayerList.forEach(player => player.rounds.push({ throw1: undefined, throw2: undefined, throw3: undefined }))
            console.log("handlnew", handleNewIndex)
        }
    }

    function handleThrow(
        currentRound: number,
        player: BASIC.PlayerProps,
        currentThrow: number,
        currentScoreAchieved: number
    ) {
        // GOOD - if the newScore is -1, the player has busted.. fix this later

        const newScore = playerList[playerTurn].score - currentScoreAchieved;

        const currentPlayerThrows = playerList[playerTurn].rounds[playerList[playerTurn].rounds.length - 1];
        console.log('player', player)
        console.log('playerList[playerTurn]', playerList[playerTurn])

        switch (currentThrow) {
            // update the current throw currentScoreAchieved in the round
            case 0: // first throw
                currentPlayerThrows.throw1 = currentScoreAchieved as unknown as number;
                break;
            case 1: // second throw
                currentPlayerThrows.throw2 = currentScoreAchieved as unknown as number;
                break;
            case 2: // third throw
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
        if (playerList[playerTurn].score === 0) { //delete isActive property?, push new property?
            toggleModal()
            playerList[playerTurn].isPlaying = false
        }
        if (playerList[playerTurn].isPlaying === false) {
            console.log("winner")
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
        let oldThrowScore = playerList[playerTurn].score; //playerscore is not working because it gets updated in the process.

        if (thirdThrow) {
            console.log("busted! on third throw!");
            let firstAndSecondThrowScore = 0;
            if (firstThrow !== undefined && secondThrow !== undefined) {
                firstAndSecondThrowScore = firstThrow + secondThrow;
            }
            oldThrowScore = firstAndSecondThrowScore + bustedPlayerScore;
            console.log(
                "busted third throw result",
                firstAndSecondThrowScore + bustedPlayerScore,
            );
            console.log(
                firstThrow,
                "+", secondThrow,
                "+", bustedPlayerScore,
                "=", oldThrowScore,
                firstAndSecondThrowScore //firstAndSecondThrowScore is wrong when 0,14,14 and 14,0,14 (zero doesnt work?)
            );
        } else if (
            firstThrow !== undefined &&
            secondThrow !== undefined &&
            secondThrow > playerList[playerTurn].score
        ) {
            // bust on second throw
            console.log("bust on second throw");
            console.log("ergebnis2", firstThrow + bustedPlayerScore);
            oldThrowScore = firstThrow + bustedPlayerScore;
        }

        playerList[playerTurn].score = oldThrowScore;
        changeActivePlayer();
    }

    function handleWinner() {
        toggleModal();
        if (throwCount > 0) {
            changeActivePlayer()
        }
    }

    function NumberButton(props: any) {
        return (
            <button
                className="btn"
                onClick={() =>
                    handleThrow(
                        roundsCount,
                        playerList[playerTurn],
                        throwCount,
                        props.value
                    )
                }
            >
                {props.value}
            </button>
        );
    }

    useEffect(() => {
        initializePlayerList(); // runs once on mount
    }, []);

    useEffect(() => {
        if (throwCount === 3 && modal === false) {
            changeActivePlayer();
        }
    }, [throwCount]);

    return (
        <>
            <div className="Gamepage">
                <div className="Roundcounter">Round: {roundsCount}</div>
                <div className="box">
                    {" "}
                    {playerList.map((item: BASIC.PlayerProps) => {
                        return <Player {...item} />;
                    })}
                </div>
            </div>

            <div className="Numberstyle">

                {keyboardNumbers.rows.map((row) => (
                    <div className="row">

                        {row.map((number) => (
                            <NumberButton value={number} />
                        ))}
                    </div>
                ))}

                <div className="row">


                    <button className="specialButton">Double</button>
                    <button className="specialButton">Triple</button>
                </div>
                <button className="backspace">zurück</button>
            </div>
            <div>
                <button onClick={changeActivePlayer}>{throwCount}</button>
            </div>
            {modal && (
                <div className="modal">
                    <div
                        className="overlay"></div>
                    <div className="modal-content">
                        <h2 className="place">{playerList[playerTurn].name} wins</h2>
                        <div>
                            <button
                                onClick={handleWinner}
                            >weiterspielen</button>
                            <Link to="/winner">
                                <button>beenden</button>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
export default GamePage;
