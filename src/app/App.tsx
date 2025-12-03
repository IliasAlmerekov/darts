import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "../css/index.css";
import Start from "../pages/start/Start";
import Game from "../pages/game/Game";
import Gamesummary from "../pages/game-summary/GameSummary";
import JoinedGame from "../pages/joined-game/JoinedGame";
import GameDetailPage from "../components/statistics/GamesOverview/GameDetailPage/GameDetailPage";
import GamesOverview from "../components/statistics/GamesOverview/GamesOverview";
import Settings from "../components/settings/Settings";
import Statistic from "../components/statistics/Statistics";
import Login from "../pages/login/Login";
import Playerprofile from "../pages/player-profile/PlayerProfile";
import Registration from "../pages/registration/Registration";
import ProtectedRoutes from "../utils/ProtectedRoutes";

function App(): React.JSX.Element {
  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Registration />} />

          <Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
            <Route path="/start" element={<Start />} />
            <Route path="/game" element={<Game />} />
            <Route path="/summary" element={<Gamesummary />} />
            <Route path="/details/:id" element={<GameDetailPage />} />
            <Route path="/gamesoverview" element={<GamesOverview />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/statistics" element={<Statistic />} />
          </Route>

          <Route element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}>
            <Route path="/joined" element={<JoinedGame />} />
            <Route path="/playerprofile" element={<Playerprofile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
