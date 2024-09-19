import '../Keyboard/Keyboard.css'
import Undo from '../../icons/undo.svg'
import ButtonBox from './ButtonBox';
import NumberButton from './NumberButton';


type Props = {
    handleClick: (value: any) => void
}

function Keyboard({ ...props }: Props) {
    const btnValues = [
        [1, 2, 3, 4, 5, 6, 7, 8],
        [9, 10, 11, 12, 13, 14, 15, 16],
        [17, 18, , 19, 20, 25, 0, "Double", "Triple", "Undo"],
    ];

    return (
        <div>
            <ButtonBox>
                {btnValues.flat().map((btn, i) => (
                    <NumberButton
                        handleClick={() => props.handleClick(btn)}
                        value={btn}
                        key={i}
                    />
                ))}
            </ButtonBox>
        </div>
    )

}
export default Keyboard