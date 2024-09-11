import '../app/App.css'
import userPLus from '../icons/user-plus.svg'

type Props = {
    handleClick: () => void;

}

function PlayerInputButton({ ...props }: Props) {

    return (
        <button className="PlayerInputButtonPB" onClick={props.handleClick}><img src={userPLus} alt="add a user" className='userplus' />Player input</button>
    )
}
export default PlayerInputButton