import '../app/App.css'
import moveIcon from '../icons/move.svg'
import deleteIcon from '../icons/delete.svg'

function SelectedPlayerItem({ ...props }: any) {

    return (
        <div className="selectedPlayerItem" key={props?.key}>
            <div>
                <img src={moveIcon} alt="Move icon" />
                <div>{props?.name}</div>
            </div>

            <img src={deleteIcon} alt="Delete icon" />
        </div>
    )

}
export default SelectedPlayerItem


/*
hat einen Namen
Eine "Löschfunktion", die den Spieler wieder zu den UnselectedPlayerItems schiebt 
Optional: einen Schiebebutton, das es ermöglicht, die Position des SelectedPlayers zu ändern.*/