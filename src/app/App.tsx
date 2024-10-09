import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { useState } from 'react';
import '../css/index.css';
import Test from '../pages/Test';
import Start, { PlayerProps } from '../pages/start/start';
import Game from '../pages/game/Game'

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
  return (
    <div className='App'>
      <BrowserRouter>
        <Routes>
          <Route path="/test" element={<Test />} />
          <Route path="/" element={<Start list={list} setList={setList} />} />
          <Route path="/game" element={<Game list={list} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
