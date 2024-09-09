import DefaultInputField from "../../components/DefaultInputField"
import PlayerInputButton from "../../components/PlayerInputButton"
import SelectedPlayerItem from "../../components/SelectedPlayerItem"
import SelectedPlayerItemList from "../../components/SelectedPlayerItemList"
import UnselectedPlayerItem from "../../components/UnselectedPlayerItem"

function Test() {
    const testComponents = [
        { name: "DefaultInputField:", source: DefaultInputField },
        { name: "PlayerInputButton:", source: PlayerInputButton },
        { name: "SelectedPlayerItem:", source: SelectedPlayerItem, props: { name: "James" } },
        { name: "UnselectedPlayerItem:", source: UnselectedPlayerItem, props: { name: "Jes" } },
        { name: "SelectedPlayerItemList:", source: SelectedPlayerItemList, props: { players: ["max", "john", "hugh"] } }
    ];


    return (
        <div style={{ display: "flex", width: "80%", flexDirection: "column" }}>
            {
                testComponents.map((component: { name: string, source: any, props?: any }) => {
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