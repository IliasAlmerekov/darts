import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "../css/index.css";
import Start from "../pages/Start/start";
import Game from "../pages/Game/Game";
import Gamesummary from "../pages/gamesummary/Gamesummary";
import GameDetailPage from "../components/Statistics/GamesOverview/GameDetailPage/GameDetailPage";
import GamesOverview from "../components/Statistics/GamesOverview/GamesOverview";
import { UserProvider } from "../provider/UserProvider";
import Settings from "../components/Settings/Settings";
import Statistic from "../components/Statistics/Statistics";

function App() {
  return (
    <div className="app">
      <BrowserRouter>
        <UserProvider>
          <Routes>
            <Route path="/" element={<Start />} />
            <Route path="/game" element={<Game />} />
            <Route path="/summary" element={<Gamesummary />} />
            <Route path="/details/:id" element={<GameDetailPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/statistics" element={<Statistic />} />
            <Route path="/gamesoverview" element={<GamesOverview />} />
          </Routes>
        </UserProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
