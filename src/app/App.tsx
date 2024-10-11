import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import '../css/index.css';
import Test from '../pages/Test';
import Start, { PlayerProps } from '../pages/start/start';
import Game from '../pages/game/Game'

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
  const [userList, setUserList] = useState(getUserFromLS())
  const [deletePlayer, setDeletePlayer] = useState<BASIC.UserProps[]>([])

  function getUserFromLS() {
    if (localStorage.getItem("User") !== null) {
      const playersFromLS = localStorage.getItem("User");
      const playersFromLocalStorage = !!playersFromLS && JSON.parse(playersFromLS);
      return playersFromLocalStorage
    }
    else {
      localStorage.setItem("User", JSON.stringify([]))
      return []
    }
  }

  function deleteUserFromLS(id: number) {
    const newUserList = [...userList]
    const userIndex = newUserList.findIndex((User: BASIC.UserProps) => User.id === id)
    newUserList.splice(userIndex, 1)
    setDeletePlayer(newUserList)
    setUserList(newUserList)
  }

  function resetLS() {
    localStorage.setItem("User", JSON.stringify(deletePlayer))
  }

  function addUserToLS(name: string, id: number) {
    const newUserList = [...userList]
    newUserList.push({ name, id })
    setUserList(newUserList)
    localStorage.setItem("User", JSON.stringify(newUserList))
  }

  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/test" element={<Test />} />
          <Route path="/" element={<Start
            list={list}
            setList={setList}
            userList={userList}
            addUserToLS={addUserToLS}
            deleteUserFromLS={deleteUserFromLS}
            resetLS={resetLS}
          />} />
          <Route path="/game" element={<Game players={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
