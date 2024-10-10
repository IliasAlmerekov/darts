import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../css/index.css';
import Test from '../pages/Test';
import Start, { PlayerProps } from '../pages/start/start';
import Game from '../pages/game/Game'

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
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


  const userList = getUserFromLS()

  function deleteUserFromLS(id: number) {
    const userList = getUserFromLS() //can delete only 1 user, because every time deleteUserFromLS runs, it gets the list that is not updated
    const userIndex = userList.findIndex((User: BASIC.UserProps) => User.id === id)
    userList.splice(userIndex, 1)
    setDeletePlayer(userList)

    console.log("deleteplayer", deletePlayer)
    console.log(userIndex)
    console.log("userlist", userList)
  }

  function resetLS() {
    localStorage.setItem("User", JSON.stringify(deletePlayer))
  }

  function addUserToLS(name: string, id: number) {
    const userList = getUserFromLS()
    userList.push({ name, id })
    localStorage.setItem("User", JSON.stringify(userList))
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
          <Route path="/game" element={<Game list={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
