import React from "react";
import { useState, useEffect } from "react";
import './gamepage.css';
import { UserProps } from "../home";
import clsx from "clsx";

type GameProps = {
    userList: UserProps[],
}

type PlayerProps = {
    id: number,
    name: string,
    score: number,
    isActive: boolean,
    index: number
}

function Boxes(props: any) {
    return (
        <div className="boxesvertical">
            <div className="eachbox"></div>
            <div className="eachbox"></div>
            <div className="eachbox"></div>
        </div>
    )
}

function Player({ item }: { item: PlayerProps }) {
    return <li className={clsx("PlayerList", { ["activePlayer"]: item.isActive === true })} id={item.id.toString()}>{item.name} <li>{item.score}</li> <Boxes /></li>;
}

function GamePage({ userList }: GameProps) {
    const [rounds, setRounds] = useState(1)
    const [playerList, setPlayerList] = useState<PlayerProps[]>([])
    const [activePlayer, setActivePlayer] = useState<PlayerProps>()
    const initialPlayerlist: PlayerProps[] = [];

    function initializePlayerList() {
        userList.forEach((user: UserProps, i) => {
            const player = { id: user.id, name: user.name, score: 301, isActive: i === 0 ? true : false, index: i }
            initialPlayerlist.push(player)

        })


        setPlayerList(initialPlayerlist)
        setActivePlayer(initialPlayerlist[0])
    }

    function NumberButton(props: any) {

        function handleClick() {
            if (!!activePlayer) {
                const newScore = activePlayer.score - props.value as number
                const newActivePlayer = { id: activePlayer.id, name: activePlayer.name, score: newScore, isActive: activePlayer.isActive, index: activePlayer.index }
                console.log(newActivePlayer)
                setActivePlayer(newActivePlayer)
            }

        }
        return <button className="btn" onClick={handleClick}>{props.value}</button>


    }

    function Boxes(props: any) {
        return (
            <div className="boxesvertical">
                <div className="eachbox"></div>
                <div className="eachbox"></div>
                <div className="eachbox"></div>
            </div>
        )
    }

    useEffect(() => {
        initializePlayerList()
    }, [])

    // useEffect(() => {
    //     if (activePlayer) {
    //         const foundPlayer = playerList.filter(player => player.id === activePlayer.id)[0]
    //         console.log('before', playerList)
    //         playerList[activePlayer.index] = foundPlayer
    //         console.log('after', playerList)
    //         const updatedPlayerList = [...playerList]
    //         setPlayerList(updatedPlayerList)
    //     }
    // }, [activePlayer])

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
            </div></>
    );
}
export default GamePage;