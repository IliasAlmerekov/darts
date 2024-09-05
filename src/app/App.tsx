import './App.css';
import GamePage from '../pages/gamepage/gamepage';
import Home from '../pages/home';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import WinnerPage from '../pages/winnerpage/winnerpage';

function App() {
  const [list, setList] = useState<BASIC.UserProps[]>([]);
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home list={list} setList={setList} />} />
          <Route path="/game" element={<GamePage userList={list} />} />
          <Route path="/winner" element={<WinnerPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
