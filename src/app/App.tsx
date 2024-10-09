import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import '../css/index.css';
import Test from '../pages/Test';
import Start, { PlayerProps } from '../pages/start/start';
import Game from '../pages/game/Game'

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
  const [userList, setUserList] = useState<BASIC.UserProps[]>([])

  useEffect(() => {
    if (localStorage.getItem("User") !== null) {
      const playersFromLS = localStorage.getItem("User");
      const playersFromLocalStorage = !!playersFromLS && JSON.parse('[{"name":"Alica","id":1728476741608}]');
      setUserList(playersFromLocalStorage)
      console.log("playerfromlsstring", playersFromLS)
    }
    else {
      localStorage.setItem("User", JSON.stringify(userList))
    }
  }, []);

  useEffect(() => {
    console.log("userlist", userList);
  }, [userList]);

  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/test" element={<Test />} />
          <Route path="/" element={<Start list={list} setList={setList} userList={userList} />} />
          <Route path="/game" element={<Game list={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
