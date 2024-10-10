import '../start/start.css'
import { Dispatch, SetStateAction, useEffect, useState } from 'react';
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
import { mockUserList } from '../../mockdata';
import clsx from 'clsx';

export type PlayerProps = {
    id: number
    name: string
    isAdded: boolean
}

export type IProps = {
    list: PlayerProps[];
    setList: Dispatch<SetStateAction<PlayerProps[]>>;
    userList: BASIC.UserProps[]
    addUserToLS: (name: string, id: number) => void
    deleteUserFromLS: (id: number) => void
    resetLS: () => void
}

function Start({ list, setList, userList, addUserToLS, deleteUserFromLS, resetLS }: IProps) {
    const [newPlayer, setNewPlayer] = useState('')
    const [isOverlayOpen, setIsOverlayOpen] = useState(false)
    const [isSettingsCogOpen, setIsSettingsCogOpen] = useState(false)
    const [deletePlayerList, setDeletePlayerList] = useState<PlayerProps[]>([])
    const [testUserSelected, setTestUserSelected] = useState<PlayerProps[]>([]);
    const [testUserUnselected, setTestUserUnselected] = useState<PlayerProps[]>([]);

    function initializePlayerList() {
        const initialPlayerlist: PlayerProps[] = [];
        userList.forEach((user: BASIC.UserProps, i: number) => {
            const player = {
                id: user.id,
                name: user.name,
                isAdded: false,
            };
            initialPlayerlist.push(player);
        });
        setTestUserUnselected(initialPlayerlist);
    }

    function handleSelect(name: any, id: number) {
        if (testUserSelected.length === 10) {
            return
        } else {
            const newList = testUserUnselected.filter((list) => list.name !== name);
            const newSelectedList: PlayerProps[] = [...testUserSelected]
            newSelectedList.push({ name, isAdded: true, id })
            setTestUserUnselected(newList);
            setTestUserSelected(newSelectedList)
            setList(newSelectedList)
        }

    }

    function handleUnselect(name: any, id: number) {
        const newList = testUserSelected.filter((list) => list.name !== name);
        const newUnselectedList: PlayerProps[] = [...testUserUnselected]
        newUnselectedList.push({ name, isAdded: false, id })
        setTestUserSelected(newList)
        setTestUserUnselected(newUnselectedList)
    }

    function createPlayer(name: any) {
        const id = Number(new Date)

        addUserToLS(name, id)
        setIsOverlayOpen(!isOverlayOpen)
        setNewPlayer("")

        if (testUserSelected.length === 10) {
            const newList = [...testUserUnselected]
            newList.push({ name, isAdded: true, id })
            setTestUserUnselected(newList) //mutable immutable
            setIsOverlayOpen(!isOverlayOpen)
            setNewPlayer("")
        } else {
            const newList = [...testUserSelected]
            newList.push({ name, isAdded: true, id })
            setTestUserSelected(newList) // 
            setIsOverlayOpen(!isOverlayOpen)
            setNewPlayer("")
        }
    }

    function deletePlayer(name: any, id: number) {
        deleteUserFromLS(id)
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
        resetLS()
    }

    useEffect(() => {
        const deleteOverlayContentEl = document.querySelector('.deleteOverlayContent')
        const overlayBottomEl = document.querySelector('.overlayBottom')
        const overlayBoxEl = document.querySelector('.overlayBox')

        const handler = () => {
            const overlayBoxHeightActual = (overlayBoxEl?.clientHeight ?? 0)
            const innerWindowHeight = overlayBoxHeightActual - (overlayBottomEl?.clientHeight ?? 0)
            if ((deleteOverlayContentEl?.getBoundingClientRect()?.bottom ?? 0) < innerWindowHeight + 60) {
                overlayBottomEl?.classList.remove('overlayBottomEnabled')
            }
        }
        handler()
    }, [deletePlayerList.length, isSettingsCogOpen])

    useEffect(() => {
        initializePlayerList();
    }, []);

    return (
        <div className='start'>
            <div className="existingPlayerList">
                <div className='header'>
                    <h4 className='headerUnselectedPlayers'>Unselected <br /> Players</h4>
                    <img
                        className='settingsCog'
                        src={settingsCog}
                        alt=""
                        onClick={() => overlayPlayerlist()
                        } />
                </div>

                {testUserUnselected.length > 0 && <div className={clsx("testUserUnselectedList", {
                    "enabled": testUserSelected.length === 10
                })}>
                    {testUserUnselected.map((player: { name: string, id: number }, index: number) => (
                        <UnselectedPlayerItem
                            {...player}
                            key={index}
                            handleClickOrDelete={() => handleSelect(player.name, player.id)}
                            src={arrowRight} />
                    ))}
                </div>}

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
                <h4 className='headerSelectedPlayers'>Selected Players <div className='listCount'>{testUserSelected.length}/10</div></h4>

                {testUserSelected.map((player: { name: string, id: number }, index: number) => (
                    <SelectedPlayerItem
                        {...player}
                        key={index}
                        handleClick={() => handleUnselect(player.name, player.id)} />
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
                        {deletePlayerList.map((player: { name: string, id: number }, index: number) => (
                            <UnselectedPlayerItem
                                {...player}
                                key={index}
                                handleClickOrDelete={() => deletePlayer(player.name, player.id)}
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