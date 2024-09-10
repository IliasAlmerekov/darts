import SelectedPlayerItem from "./SelectedPlayerItem";

type Props = {
    players: { name: string }[];
    handleClick: () => void;
};

const SelectedPlayerItemList = ({ ...props }: Props) => {
    return (
        <>
            {props.players.map((player: { name: string }, index: number) => (
                <SelectedPlayerItem {...player} key={index} handleClick={props.handleClick} />
            ))}
        </>
    );
};
export default SelectedPlayerItemList;
