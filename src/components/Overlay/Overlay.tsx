import '../Overlay/Overlay.css'
import DeleteIcon from '../../icons/delete.svg';

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
    handleDelete?: (name: string) => void
    children: any;
}

function Overlay({ ...props }: Props) {
    return (
        <>{
            props.isOpen ? (
                <div className='overlayBackground '>
                    <div className="overlayBox">
                        <div className="delete" onClick={props.onClose}><img src={DeleteIcon} alt="" /></div>
                        {props.children}
                    </div>
                </div>) : null
        }

        </>
    )
}
export default Overlay