import { UserProps } from '../home'
import '../winnerpage/winnerpage.css'
import Banner from "../../components/Banner"


function WinnerPage() {
    return (
        <div className='scoreboard'>
            <div >
                <Banner name={"Player1"} />
                <Banner name={"Player1"} />
                <Banner name={"Player1"} />
                <Banner name={"Player1"} />
                <Banner name={"Player1"} />
                <Banner name={"Player1"} />
                <Banner name={"Player1"} />
            </div>
        </div>
    )
}
export default WinnerPage