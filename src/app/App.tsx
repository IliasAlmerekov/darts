import React, { BrowserRouter, Route, Routes } from "react-router-dom";
import "../css/index.css";
import Start from "../pages/start/start";
import Game from "../pages/Game/Game";
import Gamesummary from "../pages/gamesummary/Gamesummary";
import Login from "../pages/Login/Login";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Start />} />
          <Route path="/game" element={<Game />} />
          <Route path="/summary" element={<Gamesummary />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
