import '../app/App.css'
import moveIcon from '../icons/move.svg'
import deleteIcon from '../icons/delete.svg'

type Props = {
    name: string;
    key: number;
    isAdded?: boolean;
    handleClick: () => void;
}

function SelectedPlayerItem({ ...props }: Props) {
    return (
        <div className="selectedPlayerItem" key={props?.key}>
            <div>
                <img src={moveIcon} alt="Move icon" />
                <div>{props?.name}</div>
            </div>

            <img src={deleteIcon} alt="Delete icon" onClick={props.handleClick} />
        </div>
    )

}
export default SelectedPlayerItem


/*
hat einen Namen
Eine "Löschfunktion", die den Spieler wieder zu den UnselectedPlayerItems schiebt 
Optional: einen Schiebebutton, das es ermöglicht, die Position des SelectedPlayers zu ändern.*/