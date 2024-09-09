import SelectedPlayerItem from "./SelectedPlayerItem"

const SelectedPlayerItemList = ({ ...props }: any) => {
    if (props?.players.length === 0) return null
    return (
        <>
            {props.players?.map((player: { name: string }, index: number) => (
                <SelectedPlayerItem props={player} key={index} />
            ))}
        </>)
}
export default SelectedPlayerItemList