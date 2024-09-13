import '../DeletePlayerOverlay/DeletePlayerOverlay.css'
import DeleteIcon from '../../icons/delete.svg';
import Button from '../Button/Button';
import UnselectedPlayerItem from '../PlayerItems/UnselectedPlayerItem';

type Props = {
    isOpen?: boolean
    onClose?: () => void
    handleClick?: () => void
    newPlayer?: string;
    setNewPlayer?: any;
    icon?: any;
    label?: string;
    className?: string
    iconStyling?: string
    type?: 'primary' | 'secondary';
    userMap?: any;
    src?: any;
    handleDelete: (name: string) => void

}

function DeletePLayerOverlay({ ...props }: Props) {
    return (
        <>{
            props.isOpen ? (
                <div className='overlayBackground'>
                    <div className="deleteOverlay">
                        <div className="delete" onClick={props.onClose}><img src={DeleteIcon} alt="" /></div>
                        <div className="overlayTop">Delete Players</div>
                        <div className='deleteOverlayContent'>
                            {props.userMap.map((player: { name: string }, index: number) => (
                                <UnselectedPlayerItem
                                    {...player}
                                    key={index}
                                    handleClickOrDelete={() => props.handleDelete(player.name)}
                                    src={props.src}
                                />
                            ))}
                        </div>
                        <div className='overlayBottom'>
                            <Button
                                type={props.type}
                                iconStyling={props.iconStyling}
                                className={props.className}
                                label={props.label}
                                iconSrc={props.icon}
                                handleClick={props.handleClick} />
                        </div>
                    </div>
                </div>) : null
        }

        </>
    )
}
export default DeletePLayerOverlay