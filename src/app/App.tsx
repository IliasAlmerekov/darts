import './App.css';
import GamePage from '../gamepage/gamepage';
import Home from '../home';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { UserProps } from '../home';
import { useState } from 'react';
import { PlayerProps } from '../components/Player';

export type GameProps = {
  players: PlayerProps[],
  rounds: {

  },
  spielStatus: boolean,
  date: number,
  winner: string,
  counter: number, //ist aber schon in Playerprops (score)

}

function App() {
  const [list, setList] = useState<UserProps[]>([]);
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home list={list} setList={setList} />} />
          <Route path="/game" element={<GamePage userList={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
