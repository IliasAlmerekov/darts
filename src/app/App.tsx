import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../css/index.css';
import Test from '../pages/Test';
import Start, { PlayerProps } from '../pages/start/start';
import Game from '../pages/game/Game'

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);

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
    const userList = getUserFromLS()
    const userIndex = userList.findIndex((User: BASIC.UserProps) => User.id === id)
    userList.splice(userIndex, 1)
    console.log("userlist", userList)
    localStorage.setItem("User", JSON.stringify(userList))
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
          />} />
          <Route path="/game" element={<Game list={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
