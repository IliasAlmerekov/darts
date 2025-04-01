import { BrowserRouter, Route, Routes } from "react-router-dom";
import React, { useState } from "react";
import "../css/index.css";
import Start, { PlayerProps } from "../pages/Start/Start";
import Game from "../pages/Game/Game";
import Gamesummary from "../pages/gamesummary/Gamesummary";

interface GameState {
  finishedPlayerList: BASIC.PlayerProps[];
  playerList: BASIC.PlayerProps[];
  playerScore: number;
  roundsCount: number;
  throwCount: number;
  playerTurn: number;
}

function App() {
  const [list, setList] = useState<PlayerProps[]>([]);
  const [userList, setUserList] = useState(getUserFromLS());
  const [deletePlayer, setDeletePlayer] = useState<BASIC.UserProps[]>([]);
  const [winnerList, setWinnerList] = useState<BASIC.PlayerProps[]>([]);
  const [undoFromSummary, setUndoFromSummary] = useState(false);
  const [lastHistory, setLastHistory] = useState<GameState[]>([]);

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
              <Gamesummary list={winnerList} setUndo={setUndoFromSummary} />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
