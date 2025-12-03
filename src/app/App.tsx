import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "../css/index.css";
import Start from "../pages/start/start";
import Game from "../pages/game/ui/Game";
import Gamesummary from "../pages/game-summary/GameSummary";
import JoinedGame from "../pages/joined-game/JoinedGame";
import GameDetailPage from "../components/Statistics/GamesOverview/game-detail-page/GameDetailPage";
import GamesOverview from "../components/Statistics/GamesOverview/GamesOverview";
import Settings from "../components/settings/Settings";
import Statistic from "../components/Statistics/Statistics";
import Login from "../pages/Login/Login";
import Playerprofile from "../pages/player-profile/PlayerProfile";
import Registration from "../pages/Registration/Registration";
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
