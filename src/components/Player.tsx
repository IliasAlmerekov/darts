import clsx from "clsx";
import { useEffect, useState } from "react";

export type Round = {
    throws: number[],
}

export type PlayerProps = {
    id: number,
    name: string,
    score: number,
    isActive: boolean,
    index: number,
    rounds: Round[],
}






function Boxes(props: any) {
    return (
        <div className="boxesvertical">
            <div className="eachbox">{props.throws[0]}</div>
            <div className="eachbox">{props.throws[1]}</div>
            <div className="eachbox">{props.throws[2]}</div>
        </div>
    )
}

export default function Player({ item }: { item: PlayerProps }) {
    return <li className={clsx("PlayerList", { ["activePlayer"]: item.isActive === true })} id={item.id.toString()}>{item.name} <div>{item.score}</div> <Boxes throws={item.throws} /></li>;
}
