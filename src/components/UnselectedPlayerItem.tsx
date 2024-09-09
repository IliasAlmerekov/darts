import '../app/App.css'
import arrowRight from '../icons/arrow-right.svg'

type Props = {
    name: string;
}

function UnselectedPlayerItem({ ...props }: Props) {

    return (
        <div className="unselectedPlayerItem">
            <div>{props?.name}</div>
            <img src={arrowRight} alt="Arrow right icon" />
        </div>
    )

}
export default UnselectedPlayerItem