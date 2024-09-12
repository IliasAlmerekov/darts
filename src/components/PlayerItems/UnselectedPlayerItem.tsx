import './PlayerItems.css'
import arrowRight from '../../icons/arrow-right.svg'

type Props = {
    name: any;
    isAdded?: boolean;
    handleClick: () => void;
}

function UnselectedPlayerItem({ ...props }: Props) {

    return (
        <div className="unselectedPlayerItem">
            <div>{props?.name}</div>
            <img src={arrowRight} alt="Arrow right icon" onClick={props.handleClick} />
        </div>
    )

}
export default UnselectedPlayerItem