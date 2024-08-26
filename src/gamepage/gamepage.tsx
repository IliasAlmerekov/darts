import { useState, useEffect } from "react";
import './gamepage.css';
import { UserProps } from "../home";
import Player from "../components/Player";
import { PlayerProps } from "../components/Player";
import { throws } from "assert";

type GameProps = {
    userList: UserProps[],
}

function GamePage({ userList }: GameProps) {
    const [rounds, setRounds] = useState(1)
    const [playerList, setPlayerList] = useState<PlayerProps[]>([])
    const [count, setCount] = useState(0)
    const [playerTurn, setPlayerTurn] = useState(0)


    function initializePlayerList() {
        const initialPlayerlist: PlayerProps[] = [];
        userList.forEach((user: UserProps, i) => {
            const player = { id: user.id, name: user.name, score: 301, isActive: i === 0 ? true : false, index: i, throws: [] }
            initialPlayerlist.push(player)

        })


        setPlayerList(initialPlayerlist)
    }


    function changeIsActive() {
        const prevPlayerTurn = playerTurn
        const newPlayerTurn = playerTurn + 1
        const newPlayerList: PlayerProps[] = [...playerList]

        playerList.forEach((player, i) => {
            newPlayerList[prevPlayerTurn].isActive = false
            newPlayerList[newPlayerTurn > newPlayerList.length - 1 ? 0 : newPlayerTurn].isActive = true
        });
        setPlayerList(newPlayerList)
        setPlayerTurn(newPlayerTurn)
        setCount(0)

        if (newPlayerTurn > newPlayerList.length - 1) {
            setPlayerTurn(0)
            setRounds(rounds + 1)
        }
    }


    function NumberButton(props: any) {

        function handleClick() {
            const newScore = playerList[playerTurn].score - props.value as number
            const newThrows = [...playerList[playerTurn].throws]
            newThrows.push(parseInt(props.value))
            playerList[playerTurn].throws = newThrows
            setCount(count + 1);
            console.log(playerTurn)
            console.log("playerlist", playerList.length)
            playerList[playerTurn].score = newScore

        };
        return <button className="btn" onClick={handleClick}>{props.value}</button>


    }

    useEffect(() => {
        initializePlayerList()
    }, [])

    useEffect(() => {
        if (count === 3) {
            changeIsActive()
        }
    }, [count])

    return (
        <><div className="Gamepage">
            <div className="Roundcounter">Rounds: {rounds}</div>
            <div className="box">  {playerList.map((item: PlayerProps) => {
                return <Player item={item} />;
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
                <button onClick={changeIsActive}>{count}</button>
            </div></>
    );
}
export default GamePage;