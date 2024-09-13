import DefaultInputField from "../InputField/DefaultInputField"
import DeleteIcon from '../../icons/delete.svg';
import './NewPlayerOverlay.css'
import Button from "../Button/Button";

type Props = {
    isOpen: boolean
    onClose: () => void
    handleClick: () => void
    placeholder: string
    newPlayer: string;
    setNewPlayer: any;
    icon: any;
    label: string;
    className: string
    iconStyling: string
    type?: 'primary' | 'secondary';
}

function NewPLayerOverlay({ ...props }: Props) {
    return (
        <>{
            props.isOpen ? (
                <div className="overlayBackground">
                    <div className="overlay">
                        <div className="delete" onClick={props.onClose}><img src={DeleteIcon} alt="" /></div>
                        <div>
                            <p className="copylarge">New Player</p>
                            <DefaultInputField
                                value={props.newPlayer}
                                placeholder={props.placeholder}
                                onChange={(e: any) => props.setNewPlayer(e.target.value)} />
                            <Button
                                type={props.type}
                                iconStyling={props.iconStyling}
                                className={props.className}
                                label={props.label}
                                iconSrc={props.icon}
                                handleClick={props.handleClick} />
                        </div>
                    </div>
                </div>
            ) : null
        }

        </>
    )

}
export default NewPLayerOverlay

