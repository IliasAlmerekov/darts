import '../start/start.css'
import { useState } from 'react';
import UnselectedPlayerItem from '../../components/PlayerItems/UnselectedPlayerItem';
import SelectedPlayerItem from '../../components/PlayerItems/SelectedPlayerItem';
import Plus from '../../icons/plus.svg'
import NewPLayerOverlay from '../../components/CreateNewPlayerOverlay/NewPlayerOverlay';
import Madebydeepblue from '../../icons/madeByDeepblue.svg';
import clsx from 'clsx';
import userPLus from '../../icons/user-plus.svg'
import LinkButton from '../../components/LinkButton/LinkButton';
import Button from '../../components/Button/Button';
import '../../components/Button/Button.css'


function Start() {
    const [newPlayer, setNewPlayer] = useState('')
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)
    const [testUserSelected, setTestUserSelected] = useState([
        {
            name: "Max",
            isAdded: true
        },
        {
            name: "Oliver",
            isAdded: true
        },
        {
            name: "Anna",
            isAdded: true
        }
    ]);

    const [testUserUnselected, setTestUserUnselected] = useState([
        {
            name: "Alexander",
            isAdded: false

        },
        {
            name: "Hugh",
            isAdded: false

        },
        {
            name: "Ilias",
            isAdded: false

        },
        {
            name: "Jörg",
            isAdded: false

        },
        {
            name: "Maya",
            isAdded: false

        },
        {
            name: "Nico",
            isAdded: false

        },
        {
            name: "Norman",
            isAdded: false

        },
        {
            name: "Ziyi",
            isAdded: false

        }
    ]);
    function handleSelect(name: any) {
        if (testUserSelected.length === 10) {
            alert("Maximum players reached")

        } else {
            const newList = testUserUnselected.filter((list) => list.name !== name);
            setTestUserUnselected(newList);
            testUserSelected.push({ name, isAdded: true })
            console.log(testUserSelected.length)
        }
    }

    function handleUnselect(name: any) {
        const newList = testUserSelected.filter((list) => list.name !== name);
        setTestUserSelected(newList);
        testUserUnselected.push({ name, isAdded: false })
    }

    function createPlayer(name: any) {
        if (testUserSelected.length === 10) {
            alert("Maximum players reached, the player will be unselected")
            testUserUnselected.push({ name, isAdded: true })
            setIsOverlayOpen(!isOverlayOpen)
            setNewPlayer("")
        } else {
            testUserSelected.push({ name, isAdded: true })
            setIsOverlayOpen(!isOverlayOpen)
            setNewPlayer("")
        }
    }

    return (
        <>
            <div className="existingPlayerList">

                <h4 className='headerunselectedPlayers'>Unselected <br /> Players</h4>
                {testUserUnselected.map((player: { name: string, isAdded: boolean }, index: number) => (
                    <UnselectedPlayerItem
                        {...player}
                        key={index}
                        handleClick={() => handleSelect(player.name)} />
                ))}
                <LinkButton label="Create new Player" icon={Plus} handleClick={() => setIsOverlayOpen(!isOverlayOpen)} />
                <NewPLayerOverlay
                    icon={userPLus}
                    placeholder="Player Name"
                    isOpen={isOverlayOpen}
                    onClose={() => setIsOverlayOpen(!isOverlayOpen)}
                    handleClick={() => createPlayer(newPlayer)}
                    newPlayer={newPlayer}
                    setNewPlayer={setNewPlayer}
                    label='Player Input'
                    className='playerInputButton'
                    iconStyling='userPlus'
                />
            </div>
            <div className="addedPlayerList">
                <img className='deepblueIcon' src={Madebydeepblue} alt="" />
                <h4 className='headerselectedPlayers'>Selected Players</h4>

                {testUserSelected.map((player: { name: string }, index: number) => (
                    <SelectedPlayerItem
                        {...player}
                        key={index}
                        handleClick={() => handleUnselect(player.name)} />
                ))}
                <div className='startbtn'>
                    <Button
                        isLink
                        label='Start'
                        link='/game'
                        disabled={testUserSelected.length < 2}

                    />
                </div>
            </div>
        </>
    )
}
export default Start