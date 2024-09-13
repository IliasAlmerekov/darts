import '../start/start.css'
import { useState } from 'react';
import UnselectedPlayerItem from '../../components/PlayerItems/UnselectedPlayerItem';
import SelectedPlayerItem from '../../components/PlayerItems/SelectedPlayerItem';
import Plus from '../../icons/plus.svg'
import NewPLayerOverlay from '../../components/CreateNewPlayerOverlay/NewPlayerOverlay';
import Madebydeepblue from '../../icons/madeByDeepblue.svg';
import userPLus from '../../icons/user-plus.svg'
import LinkButton from '../../components/LinkButton/LinkButton';
import Button from '../../components/Button/Button';
import '../../components/Button/Button.css'
import settingsCog from '../../icons/settings.svg'
import arrowRight from '../../icons/arrow-right.svg'
import '../../components/CreateNewPlayerOverlay/NewPlayerOverlay.css'
import DeletePLayerOverlay from '../../components/DeletePlayerOverlay/DeletePlayerOverlay';
import trashIcon from '../../icons/trash-icon.svg'

type PLayerprops = {
    name: string
    isAdded: boolean
}

function Start() {
    const [newPlayer, setNewPlayer] = useState('')
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)
    const [isSettingsCogOpen, setIsSettingsCogOpen] = useState(false)
    const [deletePlayerList, setDeletePlayerList] = useState<PLayerprops[]>([])
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
        },
        {
            name: "Christian",
            isAdded: true
        },
        {
            name: "Peter",
            isAdded: true
        },
        {
            name: "Mark",
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

        } else {
            const newList = testUserUnselected.filter((list) => list.name !== name);
            setTestUserUnselected(newList);
            testUserSelected.push({ name, isAdded: true })
        }
    }

    function handleUnselect(name: any) {
        const newList = testUserSelected.filter((list) => list.name !== name);
        setTestUserSelected(newList);
        testUserUnselected.push({ name, isAdded: false })
    }

    function createPlayer(name: any) {
        if (testUserSelected.length === 10) {
            testUserUnselected.push({ name, isAdded: true })
            setIsOverlayOpen(!isOverlayOpen)
            setNewPlayer("")
        } else {
            testUserSelected.push({ name, isAdded: true })
            setIsOverlayOpen(!isOverlayOpen)
            setNewPlayer("")
        }
    }

    function deletePlayer(name: any) {
        const newList = deletePlayerList.filter((list) => list.name !== name);
        setDeletePlayerList(newList);
    }

    function overlayPlayerlist() {
        const concatPlayerlist = testUserSelected.concat(testUserUnselected)
        setDeletePlayerList(concatPlayerlist)
        setIsSettingsCogOpen(!isSettingsCogOpen)
    }

    function updateArray() {
        //if isAdded === true selectedPlayerlist.push else unselectedPlayerlist.push
    }

    return (
        <>
            <div className="existingPlayerList">
                <div className='header'>
                    <h4 className='headerUnelectedPlayers'>Unselected <br /> Players</h4>
                    <img
                        src={settingsCog}
                        alt=""
                        onClick={() => overlayPlayerlist()} />
                </div>
                {testUserUnselected.map((player: { name: string, isAdded: boolean }, index: number) => (
                    <UnselectedPlayerItem
                        {...player}
                        key={index}
                        handleClickOrDelete={() => handleSelect(player.name)}
                        src={arrowRight} />
                ))}
                <LinkButton
                    label="Create new Player"
                    icon={Plus}
                    handleClick={() => setIsOverlayOpen(!isOverlayOpen)} />

            </div>
            <div className="addedPlayerList">
                <img className='deepblueIcon' src={Madebydeepblue} alt="" />
                <h4 className='headerSelectedPlayers'>Selected Players</h4>

                {testUserSelected.map((player: { name: string }, index: number) => (
                    <SelectedPlayerItem
                        {...player}
                        key={index}
                        handleClick={() => handleUnselect(player.name)} />
                ))}
                <div className='startBtn'>
                    <Button
                        isLink
                        label='Start'
                        link='/game'
                        disabled={testUserSelected.length < 2}
                        type='secondary'
                    />
                </div>
            </div>

            <DeletePLayerOverlay
                isOpen={isSettingsCogOpen}
                onClose={() => setIsSettingsCogOpen(!isSettingsCogOpen)}
                handleClick={() => updateArray()}
                label='Done'
                type='primary'
                userMap={deletePlayerList}
                src={trashIcon}
                handleDelete={(name) => deletePlayer(name)}

            />

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
        </>
    )
}
export default Start