import '../start/start.css'
import { useState } from 'react';
import UnselectedPlayerItem from '../../components/UnselectedPlayerItem';
import SelectedPlayerItem from '../../components/SelectedPlayerItem';
import Link from '../../components/Link';
import Plus from '../../icons/plus.svg'
import NewPLayerOverlay from '../../components/NewPlayerOverlay';



function Start() {
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)
    const [testUserSelected, setTestUserSelected] = useState([
        {
            name: "Max",
            isAdded: true
        },
        {
            name: "John",
            isAdded: true
        },
        {
            name: "Hugh",
            isAdded: true
        }
    ]);

    const [testUserUnselected, setTestUserUnselected] = useState([
        {
            name: "Marc",
            isAdded: false

        },
        {
            name: "James",
            isAdded: false

        }  // pop() and push to testuserlist
    ]);
    function handleSelect(name: any) {
        const newList = testUserUnselected.filter((list) => list.name !== name);
        setTestUserUnselected(newList);
        testUserSelected.push({ name, isAdded: true })
    }

    function handleUnselect(name: any) {
        const newList = testUserSelected.filter((list) => list.name !== name);
        setTestUserSelected(newList);
        testUserUnselected.push({ name, isAdded: false })
    }



    return (
        <>
            <div className="ExistingPlayerList">
                {testUserUnselected.map((player: { name: string, isAdded: boolean }, index: number) => (
                    <UnselectedPlayerItem {...player} key={index} handleClick={() => handleSelect(player.name)} />
                ))}
                <Link label="Create new Player" icon={Plus} handleClick={() => setIsOverlayOpen(!isOverlayOpen)} />
                <NewPLayerOverlay isOpen={isOverlayOpen} onClose={() => setIsOverlayOpen(!isOverlayOpen)} />
            </div>
            <div className="AddedPlayerList">
                {testUserSelected.map((player: { name: string }, index: number) => (
                    <SelectedPlayerItem {...player} key={index} handleClick={() => handleUnselect(player.name)} />
                ))}
            </div>
        </>
    )
}
export default Start