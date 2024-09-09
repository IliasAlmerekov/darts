import SelectedPlayerItem from "./SelectedPlayerItem";

type Props = {
    players: { name: string }[];
};

const SelectedPlayerItemList = ({ ...props }: Props) => {
    return (
        <>
            {props.players.map((player: { name: string }, index: number) => (
                <SelectedPlayerItem {...player} key={index} />
            ))}
        </>
    );
};
export default SelectedPlayerItemList;
