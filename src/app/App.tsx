import React, { BrowserRouter, Route, Routes } from "react-router-dom";
import "../css/index.css";
import Start from "../pages/Start/start";
import Game from "../pages/Game/Game";
import Gamesummary from "../pages/gamesummary/Gamesummary";

function App() {

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Start />} />
          <Route
            path="/game"
            element={
              <Game />
            }
          />
          <Route path="/summary" element={<Gamesummary />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
