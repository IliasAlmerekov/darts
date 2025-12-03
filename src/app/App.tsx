import React from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "@/css/index.css";
import Game from "@/pages/Game/ui/Game";
import Gamesummary from "@/pages/game-summary/GameSummary";
import GameDetailPage from "@/components/Statistics/GamesOverview/game-detail-page/GameDetailPage";
import GamesOverview from "@/components/Statistics/GamesOverview/GamesOverview";
import Settings from "@/components/Settings/Settings";
import Statistic from "@/components/Statistics/Statistics";
import Playerprofile from "@/pages/player-profile/PlayerProfile";
import ProtectedRoutes from "@/utils/ProtectedRoutes";
import { StartPage } from "@/pages/start";
import { LoginPage } from "@/pages/Login";
import { JoinedGamePage } from "@/pages/joined-game";
import { RegistrationPage } from "@/pages/Registration";

function App(): React.JSX.Element {
  return (
    <div className="app">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />

          <Route element={<ProtectedRoutes allowedRoles={["ROLE_ADMIN"]} />}>
            <Route path="/start" element={<StartPage />} />
            <Route path="/game" element={<Game />} />
            <Route path="/summary" element={<Gamesummary />} />
            <Route path="/details/:id" element={<GameDetailPage />} />
            <Route path="/gamesoverview" element={<GamesOverview />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/statistics" element={<Statistic />} />
          </Route>

          <Route element={<ProtectedRoutes allowedRoles={["ROLE_PLAYER"]} />}>
            <Route path="/joined" element={<JoinedGamePage />} />
            <Route path="/playerprofile" element={<Playerprofile />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
