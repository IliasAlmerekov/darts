import { useState, useEffect } from "react";
import './gamepage.css';
import { UserProps } from "../home";
import Player from "../../components/Player";
import { PlayerProps } from "../../components/Player";
import { KeyboardProps } from "../../components/Keyboard";
import { ppid } from "process";

/* export type GameProps = {
    player: PlayerProps
} */

type UserList = {

    userList: UserProps[],
}

const testUserList = [
    {
        id: 1,
        name: "name 1",
    },
    {
        id: 2,
        name: "name 2",
    },
]

function GamePage({ userList }: UserList) {
    const [playerScore, setPlayerScore] = useState(15)
    const [roundsCount, setRoundsCount] = useState(1) //Rundenanzeige
    const [playerList, setPlayerList] = useState<PlayerProps[]>([])
    const [throwCount, setThrowCount] = useState(0) // zählt wie oft geworfen wurde
    const [playerTurn, setPlayerTurn] = useState(0)
    const keyboardNumbers: KeyboardProps = {
        rows: [
            [1, 2, 3, 4, 5, 6, 7, 8],
            [9, 10, 11, 12, 13, 14, 15, 16],
            [17, 18, 19, 20, 25, 50, 0, 0],
        ]
    }


    function initializePlayerList() {
        const initialPlayerlist: PlayerProps[] = [];
        testUserList.forEach((user: UserProps, i) => {
            const player = {
                id: user.id, name: user.name, score: playerScore, isActive: i === 0 ? true : false, index: i, rounds: [], displayThrows: [],
            }
            initialPlayerlist.push(player)


        })

        setPlayerList(initialPlayerlist)
    }



    function changeActivePlayer() {
        const prevPlayerTurn = playerTurn;
        const newPlayerTurn = playerTurn + 1;
        const newPlayerList: PlayerProps[] = [...playerList];
        newPlayerList[prevPlayerTurn].isActive = false;
        newPlayerList[newPlayerTurn > newPlayerList.length - 1 ? 0 : newPlayerTurn].isActive = true;
        newPlayerList[newPlayerTurn > newPlayerList.length - 1 ? 0 : newPlayerTurn].rounds.push({ throw1: undefined, throw2: undefined, throw3: undefined })
        setPlayerList(newPlayerList);
        setPlayerTurn(newPlayerTurn);
        setThrowCount(0);

        if (newPlayerTurn > newPlayerList.length - 1) {
            setPlayerTurn(0);
            setRoundsCount(roundsCount + 1);
        }
    }

    function bust(playerBustScore: number, value: number) {
        const firstThrow = playerList[playerTurn].rounds[roundsCount - 1].throw1
        const secondThrow = playerList[playerTurn].rounds[roundsCount - 1].throw2
        const thirdThrow = playerList[playerTurn].rounds[roundsCount - 1].throw3
        //alert("bust")
        let oldThrowScore = 0;
        if (firstThrow && secondThrow && thirdThrow && thirdThrow > playerList[playerTurn].score) {
            // bust on third throw
            console.log("bust on third throw")
            oldThrowScore = firstThrow + secondThrow + playerBustScore;
        } else if (firstThrow && secondThrow && secondThrow > playerList[playerTurn].score) {
            // bust on second throw
            console.log("bust on second throw")
            oldThrowScore = firstThrow + playerBustScore;
        }
        console.log("oldThrowScore", oldThrowScore)
        playerList[playerTurn].score = oldThrowScore
        changeActivePlayer()
    }

    function handleThrow(round: number, player: PlayerProps, count: number, value: number) {
        if (!player.rounds.length) {
            player.rounds.push({ throw1: undefined, throw2: undefined, throw3: undefined })
        }
        const currentRound = player.rounds[round - 1]
        const newsScore = playerList[playerTurn].score - value
        setPlayerScore(newsScore)

        if (count === 0) {
            player.rounds[round - 1].throw1 = value as unknown as number
        }

        if (count === 1) {
            player.rounds[round - 1].throw2 = value as unknown as number
        }

        if (count === 2) {
            player.rounds[round - 1].throw3 = value as unknown as number
        }

        if (playerList[playerTurn].score > value) {
            playerList[playerTurn].score = newsScore
            setThrowCount(count + 1);
        }
        
        if (playerList[playerTurn].score - value === 0) {
            /* window.location.replace('/winner') */
            alert("winner winner chicken dinner")
            
        } else if (playerList[playerTurn].score < value) {
            bust(playerScore, value)
        }

        const updatedPlayerlist = [...playerList]
        updatedPlayerlist[playerTurn] = player
        setPlayerList(updatedPlayerlist)
    };

    function NumberButton(props: any) {
        return <button className="btn" onClick={() => handleThrow(roundsCount, playerList[playerTurn], throwCount, props.value)}>{props.value}</button>
    }

    useEffect(() => {
        initializePlayerList()
    }, [])

    useEffect(() => {
        if (throwCount === 3) {
            changeActivePlayer()
        }
    }, [throwCount])

    return (
        <>
            <div className="Gamepage">
                <div className="Roundcounter">Round: {roundsCount}</div>
                <div className="box">  {playerList.map((item: PlayerProps) => {
                    return <Player {...item} />;
                })}
                </div>


            </div>
            <div className="Numberstyle">
                {keyboardNumbers.rows.map((row) =>
                    <div className="row">
                        {row.map((number) =>
                            <NumberButton value={number} />
                        )}:
                    </div>
                )}
                <div className="row">
                    <button className="specialButton">Double</button>
                    <button className="specialButton">Triple</button>
                </div>
            </div>
            <div>
                <button onClick={changeActivePlayer}>{throwCount}</button>
            </div></>
    );
}
export default GamePage;