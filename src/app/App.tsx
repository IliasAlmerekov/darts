import './App.css';
import GamePage from '../pages/gamepage/gamepage';
import Home from '../pages/home';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { UserProps } from '../pages/home';
import { useState } from 'react';

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
