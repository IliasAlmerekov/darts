import clsx from 'clsx';
import './PlayerItems.css'


type Props = {
    name: any;
    isAdded?: boolean;
    handleClickOrDelete: () => void;
    src: any;
    alt?: string;
    isClicked?: boolean
}

function UnselectedPlayerItem({ ...props }: Props) {
    return (
        <div className={clsx("unselectedPlayerItem", {
            "fade-out": !!props.isClicked
        })}>
            <div className='copylarge'>{props?.name}</div>
            <img src={props.src} alt={props.alt} onClick={props.handleClickOrDelete} />
        </div>
    )

}
export default UnselectedPlayerItem