import './App.css';
import GamePage from '../pages/gamepage/gamepage';
import Home from '../pages/home';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import WinnerPage from '../pages/winnerpage/winnerpage';
import '../css/index.css';
import Test from '../pages/Test';
import Start from '../pages/start/start';
import '../fonts/circularXX/stylesheet.css'
import Game from '../pages/Game/Game';

function App() {
  const [list, setList] = useState<BASIC.UserProps[]>([]);
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home list={list} setList={setList} />} />
          <Route path="/gamepage" element={<GamePage userList={list} />} />
          <Route path="/winner" element={<WinnerPage />} />
          <Route path="/test" element={<Test />} />
          <Route path="/start" element={<Start />} />
          <Route path="/game" element={<Game />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
