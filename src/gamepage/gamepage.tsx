import { useState, useEffect } from "react";
import './gamepage.css';
import { UserProps } from "../home";
import Player from "../components/Player";
import { PlayerProps } from "../components/Player";

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
    const [roundsCount, setRoundsCount] = useState(1)
    const [playerList, setPlayerList] = useState<PlayerProps[]>([])
    const [throwCount, setThrowCount] = useState(0)
    const [playerTurn, setPlayerTurn] = useState(0)

    function initializePlayerList() {
        const initialPlayerlist: PlayerProps[] = [];
        testUserList.forEach((user: UserProps, i) => {
            const player = {
                id: user.id, name: user.name, score: 301, isActive: i === 0 ? true : false, index: i, rounds: [], displayThrows: []
            }
            initialPlayerlist.push(player)


        })

        setPlayerList(initialPlayerlist)
    }

    function changeIsActive() {
        const prevPlayerTurn = playerTurn;
        const newPlayerTurn = playerTurn + 1;
        const newPlayerList: PlayerProps[] = [...playerList];

        newPlayerList[prevPlayerTurn].isActive = false;
        newPlayerList[newPlayerTurn > newPlayerList.length - 1 ? 0 : newPlayerTurn].isActive = true;

        setPlayerList(newPlayerList);
        setPlayerTurn(newPlayerTurn);
        setThrowCount(0);

        if (newPlayerTurn > newPlayerList.length - 1) {
            setPlayerTurn(0);
            setRoundsCount(roundsCount + 1);
        }
    }


    function NumberButton(props: any) {

        const activePlayer = playerList[playerTurn]
        function handleThrow(round: number, player: PlayerProps, count: number, value: string) {
            const currentRound = player.rounds[round - 1]
            const newScore = playerList[playerTurn].score - props.value as number

            if (currentRound === undefined) {
                player.rounds.push({ throw1: undefined, throw2: undefined, throw3: undefined })
                if (count === 0) {
                    player.rounds[round - 1].throw1 = value as unknown as number
                }
            }

            if (!!currentRound) {
                if (count === 1) {
                    player.rounds[round - 1].throw2 = value as unknown as number
                }
                if (count === 2) {
                    player.rounds[round - 1].throw3 = value as unknown as number
                }
            }
            const updatedPlayerlist = [...playerList]
            updatedPlayerlist[playerTurn] = player
            setPlayerList(updatedPlayerlist)
            setThrowCount(count + 1);
            playerList[playerTurn].score = newScore
        };
        return <button className="btn" onClick={() => handleThrow(roundsCount, activePlayer, throwCount, props.value)}>{props.value}</button>
    }


    useEffect(() => {
        initializePlayerList()
    }, [])

    useEffect(() => {
        if (throwCount === 3) {
            changeIsActive()
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
                <div className="row">
                    <NumberButton value="1" />
                    <NumberButton value="2" />
                    <NumberButton value="3" />
                    <NumberButton value="4" />
                    <NumberButton value="5" />
                    <NumberButton value="6" />
                    <NumberButton value="7" />
                    <NumberButton value="8" />
                </div>
                <div className="row">
                    <NumberButton value="9" />
                    <NumberButton value="10" />
                    <NumberButton value="11" />
                    <NumberButton value="12" />
                    <NumberButton value="13" />
                    <NumberButton value="14" />
                    <NumberButton value="15" />
                    <NumberButton value="16" />

                </div>
                <div className="row">
                    <NumberButton value="17" />
                    <NumberButton value="18" />
                    <NumberButton value="19" />
                    <NumberButton value="20" />
                    <NumberButton value="25" />
                    <NumberButton value="50" />
                    <NumberButton value="0" />
                    <NumberButton value="" />
                </div>
                <div className="row">
                    <button className="specialButton">Double</button>
                    <button className="specialButton">Triple</button>

                </div>
            </div>

            <div>
                <button onClick={changeIsActive}>{throwCount}</button>
            </div></>
    );
}
export default GamePage;