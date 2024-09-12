import DefaultInputField from "../../components/InputField/DefaultInputField";
import Button from "../../components/Button/Button";
import SelectedPlayerItem from "../../components/PlayerItems/SelectedPlayerItem";
import UnselectedPlayerItem from "../../components/PlayerItems/UnselectedPlayerItem";

function Test() {
    const testComponents = [
        { name: "DefaultInputField:", source: DefaultInputField },
        { name: "PlayerInputButton:", source: Button },
        { name: "PlayerInputButton Red:", source: Button, props: { label: "player" } },
        { name: "PlayerInputButton Blue:", source: Button, props: { label: "player2", type: "secondary" } },
        { name: "PlayerInputButton inverted:", source: Button, props: { label: "player3", isInverted: true } },
        { name: "PlayerInputButton inverted secondary:", source: Button, props: { label: "player4", type: "secondary", isInverted: true, disabled: true } },
        {

            name: "SelectedPlayerItem:",
            source: SelectedPlayerItem,
            props: { name: "James" },
        },
        {
            name: "UnselectedPlayerItem:",
            source: UnselectedPlayerItem,
            props: { name: "Jes" },
        },
        {
            name: "SelectedPlayerItemList:",
            source: SelectedPlayerItem,
            props: { players: [{ name: "Max" }, { name: "John" }, { name: "Hugh" }] },
        },
    ];

    return (
        <div style={{ display: "flex", width: "80%", flexDirection: "column" }}>
            {testComponents.map(
                (component: { name: string; source: any; props?: any }) => {
                    return (
                        <>
                            <p>{component.name}</p>
                            <component.source {...component.props} />
                        </>
                    );
                }
            )}
        </div>
    );
}
export default Test;
