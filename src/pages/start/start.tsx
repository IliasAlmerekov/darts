import '../start/start.css'
import UnselectedPlayerItem from '../../components/UnselectedPlayerItem'
import SelectedPlayerItem from '../../components/SelectedPlayerItem'

type mockNamesList = {
    name: string;
    key: number;
    isAdded: boolean;
}

function Start() {
    return (
        <>
            <div className="ExistingPlayerList">
                <UnselectedPlayerItem isAdded={false} name={"Max"} />
            </div>
            <div className="AddedPlayerList">
                <SelectedPlayerItem isAdded={true} name={"Jes"} key={1} />
            </div>
        </>
    )
}
export default Start