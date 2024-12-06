import { BrowserRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
import "../css/index.css";
import Test from "../pages/Test";
import Start, { PlayerProps } from "../pages/Start/Start";
import Game from "../pages/Game/Game";
import Gamesummary from "../pages/gamesummary/Gamesummary";

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
  const [userList, setUserList] = useState(getUserFromLS());
  const [deletePlayer, setDeletePlayer] = useState<BASIC.UserProps[]>([]);
  const [winnerList, setWinnerList] = useState<BASIC.PlayerProps[]>([]);
  const [undoFromSummary, setUndoFromSummary] = useState(false);
  const [lastHistory, setLastHistory] = useState<any[]>([]);

  function getUserFromLS() {
    if (localStorage.getItem("User") !== null) {
      const playersFromLS = localStorage.getItem("User");
      const playersFromLocalStorage =
        !!playersFromLS && JSON.parse(playersFromLS);
      return playersFromLocalStorage;
    } else {
      localStorage.setItem("User", JSON.stringify([]));
      return [];
    }
  }

  function addUnselectedUserListToLs(unselectedPlayers: PlayerProps[]) {
    localStorage.setItem("UserUnselected", JSON.stringify(unselectedPlayers));
  }

  function deleteUserFromLS(id: number) {
    const newUserList = [...userList];
    const userIndex = newUserList.findIndex(
      (User: BASIC.UserProps) => User.id === id
    );
    newUserList.splice(userIndex, 1);
    setDeletePlayer(newUserList);
    setUserList(newUserList);
  }

  function resetLS() {
    localStorage.setItem("User", JSON.stringify(deletePlayer));
  }

  function addUserToLS(name: string, id: number) {
    const newUserList = [...userList];
    newUserList.push({ name, id });
    setUserList(newUserList);
    localStorage.setItem("User", JSON.stringify(newUserList));
  }

  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/test" element={<Test />} />
          <Route
            path="/"
            element={
              <Start
                list={list}
                setList={setList}
                userList={userList}
                addUserToLS={addUserToLS}
                deleteUserFromLS={deleteUserFromLS}
                resetLS={resetLS}
                addUnselectedUserListToLs={addUnselectedUserListToLs}
              />
            }
          />
          <Route
            path="/game"
            element={
              <Game
                players={list}
                setWinnerList={setWinnerList}
                undoFromSummary={undoFromSummary}
                setUndoFromSummary={setUndoFromSummary}
                setLastHistory={setLastHistory}
                lastHistory={lastHistory}
              />
            }
          />
          <Route
            path="/summary"
            element={
              <Gamesummary list={winnerList} setUndo={setUndoFromSummary} />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
