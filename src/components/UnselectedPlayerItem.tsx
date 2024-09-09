import '../app/App.css'
import arrowRight from '../icons/arrow-right.svg'

function UnselectedPlayerItem() {

    return (
        <div className="unselectedPlayerItem">
            <div>Max</div>
            <img src={arrowRight} alt="Arrow right icon" />
        </div>
    )

}
export default UnselectedPlayerItem