import { BrowserRouter, Route, Routes } from "react-router-dom";
import "../css/index.css";
import Start from "../pages/Start/start";
import Game from "../pages/Game/Game";
import Gamesummary from "../pages/gamesummary/Gamesummary";
import { useUser } from "../provider/UserProvider";

function App() {
  const { event, updateEvent} = useUser();

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Start />
            }
          />
          <Route
            path="/game"
            element={
              <Game
                players={event.list}
                setWinnerList={(newWinnerList) => updateEvent({winnerList: newWinnerList})}
                undoFromSummary={event.undoFromSummary}
                setUndoFromSummary={(newUndoFromSummary) => updateEvent({undoFromSummary: newUndoFromSummary})}
                setLastHistory={(newLastHistory) => updateEvent({lastHistory: newLastHistory})}
                lastHistory={event.lastHistory}
                setUndoLastHistory={function (): void {
                  throw new Error("Function not implemented.");
                }}
                undoLastHistory={false}
              />
            }
          />
          <Route
            path="/summary"
            element={
              <Gamesummary />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;