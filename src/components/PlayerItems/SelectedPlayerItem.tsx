import moveIcon from '../../icons/move.svg'
import deleteIcon from '../../icons/delete.svg'
import './PlayerItems.css'

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