import '../app/App.css'
import arrowRight from '../icons/arrow-right.svg'

function UnselectedPlayerItem({ ...props }: any) {

    return (
        <div className="unselectedPlayerItem">
            <div>{props?.name}</div>
            <img src={arrowRight} alt="Arrow right icon" />
        </div>
    )

}
export default UnselectedPlayerItem