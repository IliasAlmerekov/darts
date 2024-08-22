import './App.css';
import GamePage from '../gamepage/gamepage';
import Home from '../home';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { PlayerProps } from '../home';
import { useState } from 'react';


function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home list={list} setList={setList} />} />
          <Route path="/game" element={<GamePage list={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
