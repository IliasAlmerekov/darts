import { useState } from "react"

type Props = {
    isOpen: boolean
    onClose: () => void
}

function NewPLayerOverlay({ ...props }: Props) {
    return (
        <>{
            props.isOpen ? (
                <div className="overlay" onClick={props.onClose}>
                    <div className="overlayBackground"></div>
                    <div className="overlayContainer">
                        <p>hello</p>
                    </div>
                </div>
            ) : null
        }

        </>
    )

}
export default NewPLayerOverlay

