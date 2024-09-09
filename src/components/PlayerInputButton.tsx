import '../app/App.css'
import userPLus from '../icons/user-plus.svg'

function PlayerInputButton() {

    return (
        <button className="PlayerInputButtonPB"><img src={userPLus} alt="add a user" className='userplus' />Player input</button>
    )
}
export default PlayerInputButton