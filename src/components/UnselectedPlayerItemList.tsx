import UnselectedPlayerItem from "./UnselectedPlayerItem";

type Props = {
    players: { name: string, isAdded: boolean }[];
    handleClick: () => void;
};

const UnselectedPlayerItemList = ({ ...props }: Props) => {
    return (
        <>
            {props.players.map((player: { name: string, isAdded: boolean }, index: number) => (
                <UnselectedPlayerItem {...player} key={index} handleClick={props.handleClick} />
            ))}
        </>
    );
};
export default UnselectedPlayerItemList;
