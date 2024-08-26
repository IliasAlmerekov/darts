import clsx from "clsx";



export type PlayerProps = {
    id: number,
    name: string,
    score: number,
    isActive: boolean,
    index: number,
    throws: number[],
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