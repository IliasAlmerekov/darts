import '../app/App.css'
import moveIcon from '../icons/move.svg'
import deleteIcon from '../icons/delete.svg'
function SelectedPlayerItem() {

    return (
        <div className="selectedPlayerItem">
            <div>
                <img src={moveIcon} alt="Move icon" />
                <div>Max</div>
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