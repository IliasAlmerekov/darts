import DefaultInputField from "../../components/DefaultInputField"
import PlayerInputButton from "../../components/PlayerInputButton"
import SelectedPlayerItem from "../../components/SelectedPlayerItem"
import UnselectedPlayerItem from "../../components/UnselectedPlayerItem"

function Test() {
    const testComponents = [
        { name: "DefaultInputField:", source: DefaultInputField },
        { name: "PlayerInputButton:", source: PlayerInputButton },
        { name: "SelectedPlayerItem:", source: SelectedPlayerItem },
        { name: "UnselectedPlayerItem:", source: UnselectedPlayerItem }]

    return (
        <div style={{ display: "flex", width: "80%", flexDirection: "column" }}>
            {
                testComponents.map((component: { name: string, source: any, props?: string }) => {
                    return (
                        <>
                            <p>{component.name}</p>
                            <component.source props={component.props} />
                        </>
                    )
                })
            }
        </div>
    )
}
export default Test