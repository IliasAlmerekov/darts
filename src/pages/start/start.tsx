import '../start/start.css'
import { useEffect, useState } from 'react';
import UnselectedPlayerItem from '../../components/PlayerItems/UnselectedPlayerItem';
import SelectedPlayerItem from '../../components/PlayerItems/SelectedPlayerItem';
import Plus from '../../icons/plus.svg'
import Madebydeepblue from '../../icons/madeByDeepblue.svg';
import userPLus from '../../icons/user-plus.svg'
import LinkButton from '../../components/LinkButton/LinkButton';
import Button from '../../components/Button/Button';
import '../../components/Button/Button.css'
import settingsCog from '../../icons/settings.svg'
import arrowRight from '../../icons/arrow-right.svg'
import trashIcon from '../../icons/trash-icon.svg'
import Overlay from '../../components/Overlay/Overlay';
import DefaultInputField from '../../components/InputField/DefaultInputField';
import deleteIcon from '../../icons/delete.svg'

type PlayerProps = {
    name: string
    isAdded: boolean
}

function Start() {
    const [newPlayer, setNewPlayer] = useState('')
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)
    const [isSettingsCogOpen, setIsSettingsCogOpen] = useState(false)
    const [deletePlayerList, setDeletePlayerList] = useState<PlayerProps[]>([])
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
        },
        {
            name: "Tom",
            isAdded: true
        },
        {
            name: "Thomas",
            isAdded: true
        },
        {
            name: "Hendrik",
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
            const newSelectedList: PlayerProps[] = [...testUserSelected]
            newSelectedList.push({ name, isAdded: false })
            setTestUserUnselected(newList);
            setTestUserSelected(newSelectedList)
        }
    }

    function handleUnselect(name: any) {
        const newList = testUserSelected.filter((list) => list.name !== name);
        const newUnselectedList: PlayerProps[] = [...testUserUnselected]
        newUnselectedList.push({ name, isAdded: false })
        setTestUserSelected(newList)
        setTestUserUnselected(newUnselectedList)
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
        const newSelectedList: PlayerProps[] = []
        const newUnselectedList: PlayerProps[] = []
        deletePlayerList.forEach(player => {
            if (player.isAdded === true) {
                newSelectedList.push(player)
            }
            if (player.isAdded === false) {
                newUnselectedList.push(player)
            }
        },
        )
        setTestUserUnselected(newUnselectedList)
        setTestUserSelected(newSelectedList)
        setIsSettingsCogOpen(!isSettingsCogOpen)
    }

    useEffect(() => {
        const deleteOverlayContentEl = document.querySelector('.deleteOverlayContent')
        const overlayBottomEl = document.querySelector('.overlayBottom')
        const overlayBoxEl = document.querySelector('.overlayBox')

        const handler = () => {
            const overlayBoxHeightActual = (overlayBoxEl?.clientHeight ?? 0)
            const innerWindowHeight = overlayBoxHeightActual - (overlayBottomEl?.clientHeight ?? 0)
            console.log('deleteOverlayContentEl?.getBoundingClientRect()?.bottom ?? 0) < innerWindowHeight', deleteOverlayContentEl?.getBoundingClientRect()?.bottom ?? 0, innerWindowHeight)
            if ((deleteOverlayContentEl?.getBoundingClientRect()?.bottom ?? 0) < innerWindowHeight + 60) {
                overlayBottomEl?.classList.remove('overlayBottomEnabled')
            }
        }
        handler()
    }, [deletePlayerList.length, isSettingsCogOpen])



    return (
        <div className='start'>
            <div className="existingPlayerList">
                <div className='header'>
                    <h4 className='headerUnelectedPlayers'>Unselected <br /> Players</h4>
                    <img
                        className='settingsCog'
                        src={settingsCog}
                        alt=""
                        onClick={() => overlayPlayerlist()
                        } />
                </div>

                <div className='testUserUnselectedList'>
                    {testUserUnselected.map((player: { name: string, isAdded: boolean }, index: number) => (
                        <UnselectedPlayerItem
                            {...player}
                            key={index}
                            handleClickOrDelete={() => handleSelect(player.name)}
                            src={arrowRight} />
                    ))}
                </div>

                <div className='bottom'>
                    <LinkButton
                        className='createNewPlayerButton h4'
                        label="Create new Player"
                        icon={Plus}
                        handleClick={() => setIsOverlayOpen(!isOverlayOpen)} />
                </div>
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

            <Overlay
                className='overlayBox deletePlayerOverlayAdjust'
                src={deleteIcon}
                isOpen={isSettingsCogOpen}
                onClose={() => setIsSettingsCogOpen(!isSettingsCogOpen)}>
                <div className='deletePlayerOverlay'>
                    <p className="copylarge">Delete Player</p>
                    <div className='deleteOverlayContent'>
                        {deletePlayerList.map((player: { name: string }, index: number) => (
                            <UnselectedPlayerItem
                                {...player}
                                key={index}
                                handleClickOrDelete={() => deletePlayer(player.name)}
                                src={trashIcon}
                            />
                        ))}
                    </div>

                </div>
                <div className='overlayBottom overlayBottomEnabled'>
                    <Button
                        className='deleteOverlayButton'
                        type="primary"
                        label='Done'
                        handleClick={() => updateArray()} />
                </div>
            </Overlay>

            <Overlay
                className='overlayBox'
                src={deleteIcon}
                isOpen={isOverlayOpen}
                onClose={() => setIsOverlayOpen(!isOverlayOpen)}>
                <div className='createPlayerOverlay'>
                    <p className="copylarge">New Player</p>
                    <DefaultInputField
                        value={newPlayer}
                        placeholder="Playername"
                        onChange={(e: any) => setNewPlayer(e.target.value)} />
                    <Button
                        iconStyling='userPlus'
                        label='Player Input'
                        iconSrc={userPLus}
                        handleClick={() => createPlayer(newPlayer)} />
                </div>
            </Overlay>
        </div>
    )
}
export default Start