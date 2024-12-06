import '../Overlay/Overlay.css'

type Props = {
    isOpen?: boolean
    onClose?: () => void
    handleClick?: () => void
    className?: string
    src?: string;
    children: any;
}

function Overlay({ ...props }: Props) {
    return (
        <>{
            props.isOpen ? (
                <div className='overlayBackground'>
                    <div className={props.className}>
                        <div className="delete" onClick={props.onClose}><img src={props.src} alt="" /></div>
                        {props.children}
                    </div>
                </div>) : null
        }

        </>
    )
}
export default Overlay