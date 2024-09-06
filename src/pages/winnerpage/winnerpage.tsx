import '../winnerpage/winnerpage.css'
import Banner from "../../components/Banner"
import { Link } from 'react-router-dom'

function WinnerPage() {
    return (
        <div className='scoreboard'>
            <div className='Playerprofile'>
                <div className='profile2'></div>
                <div className='Place2'>2</div>
                <div className='profile1'></div>
                <div className='Place1'>1</div>
                <div className='profile3'></div>
                <div className='Place3'>3</div>
            </div>
            <div >
                <Banner name={"Player1"} />
                <Banner name={""} />
                <Banner name={""} />
                <Banner name={""} />
                <Banner name={""} />
                <Banner name={""} />
            </div>
            <Link to="/" >
                <div className='Playagain'>Play again</div>
            </Link>
        </div>
    )
}
export default WinnerPage