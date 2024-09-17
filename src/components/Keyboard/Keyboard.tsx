import '../Keyboard/Keyboard.css'
import Undo from '../../icons/undo.svg'

function Keyboard() {
    return (
        <button className="keyboardContainer">
            <button className='keyboardButton'>1</button>
            <button className='keyboardButton'>2</button>
            <button className='keyboardButton'>3</button>
            <button className='keyboardButton'>4</button>
            <button className='keyboardButton'>5</button>
            <button className='keyboardButton'>6</button>
            <button className='keyboardButtonSpecial'>Double</button>
            <button className='keyboardButton'>7</button>
            <button className='keyboardButton'>8</button>
            <button className='keyboardButton'>9</button>
            <button className='keyboardButton'>10</button>
            <button className='keyboardButton'>11</button>
            <button className='keyboardButton'>12</button>
            <button className='keyboardButtonSpecial'>Triple</button>
            <button className='keyboardButton'>13</button>
            <button className='keyboardButton'>14</button>
            <button className='keyboardButton'>15</button>
            <button className='keyboardButton'>16</button>
            <button className='keyboardButton'>17</button>
            <button className='keyboardButton'>18</button>
            <button className='keyboardButtonSpecial'><img src={Undo} alt="" /></button>
            <button className='keyboardButton'>10</button>
            <button className='keyboardButton'>21</button>
            <button className='keyboardButton'>22</button>
            <button className='keyboardButton'>23</button>
            <button className='keyboardButton'>24</button>
            <button className='keyboardButton'>25</button>
            <button className='keyboardButton'>0</button>
        </button>
    )

}
export default Keyboard