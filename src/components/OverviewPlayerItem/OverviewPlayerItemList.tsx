import OverviewPlayerItem from "./OverviewPlayerItem"

type Props = {
    userMap: any
}

function OverviewPlayerItemList({ ...props }: Props) {
    return (
        <>
            {
                props.userMap.map((item: BASIC.PlayerProps, index: number) => (
                    <OverviewPlayerItem
                        name={item.name}
                        placement={index + 4}
                        className="overviewPlayerItem"
                        rounds={item.rounds[item.rounds.length - 1].throw1 === undefined ? item.rounds.length - 1 : item.rounds.length}
                        averagePerRound={(Math.round((301 - item.score) / (item.rounds[item.rounds.length - 1].throw1 === undefined ? item.rounds.length - 1 : item.rounds.length))) === Infinity ? 0 : Math.round((301 - item.score) / (item.rounds[item.rounds.length - 1].throw1 === undefined ? item.rounds.length - 1 : item.rounds.length))}
                    />
                ))
            }
        </>
    )
}
export default OverviewPlayerItemList