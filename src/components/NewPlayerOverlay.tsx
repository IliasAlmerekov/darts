import { useState } from "react"
import DefaultInputField from "./DefaultInputField"
import PlayerInputButton from "./PlayerInputButton"
import DeleteIcon from '../icons/delete.svg'
type Props = {
    isOpen: boolean
    onClose: () => void
    handleClick: () => void
    placeholder: string
    newPlayer: string;
    setNewPlayer: any;
}

function NewPLayerOverlay({ ...props }: Props) {
    return (
        <>{
            props.isOpen ? (
                <div className="overlay">
                    <div className="delete"><img src={DeleteIcon} alt="" /></div>
                    <div>
                        <p className="copylarge">New Player</p>
                        <DefaultInputField value={props.newPlayer} placeholder={props.placeholder} onChange={(e: any) => props.setNewPlayer(e.target.value)} />
                        <PlayerInputButton handleClick={props.handleClick} />
                    </div>
                </div>

            ) : null
        }

        </>
    )

}
export default NewPLayerOverlay

