import Keyboard from "../../components/Keyboard/Keyboard";
import "./game.css";
import Back from "../../icons/back.svg";
import { Link, useNavigate } from "react-router-dom";
import React, { useEffect } from "react";
import GamePlayerItemList from "../../components/GamePlayerItem/GamplayerItemList";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/Keyboard/NumberButton";
import FinishedGamePlayerItemList from "../../components/GamePlayerItem/FinishedGamePlayerItemList";
import LinkButton from "../../components/LinkButton/LinkButton";
import deleteIcon from "../../icons/delete.svg";
import Undo from "../../icons/undo-copy.svg";
import { useUser } from "../../provider/UserProvider";
import settingsIcon from "../../icons/settings-inactive.svg";
import SettingsGroupBtn from "../../components/Button/SettingsGroupBtn";

function Game() {
  const WIN_SOUND_PATH = "/sounds/win-sound.mp3";

  const { event, updateEvent, functions } = useUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (event.throwCount === 3 && !event.isFinishGameOverlayOpen) {
      functions.changeActivePlayer();
    }
  }, [event.throwCount, event.isFinishGameOverlayOpen, functions]);

  useEffect(() => {
    if (event.list.length > 0 && event.finishedPlayerList.length === event.list.length) {
      updateEvent({
        winnerList: event.finishedPlayerList,
        lastHistory: event.history,
      });
      navigate("/summary");
      if (event.list.length === 2) {
        functions.playSound(WIN_SOUND_PATH);
      }
    }
  }, [
    event.finishedPlayerList.length,
    event.list.length,
    event.finishedPlayerList,
    event.history,
    functions,
    navigate,
    updateEvent,
  ]);

  useEffect(() => {
    if (!event.playerList || event.playerList.length === 0) return;

    if (event.playerTurn === 5 || event.playerTurn + 1 === event.playerList.length) {
      const player = document.getElementById(`playerid-${event.playerTurn}`);
      player?.scrollIntoView({
        behavior: "smooth",
      });
    } else if (event.playerTurn === 0) {
      window.scroll({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [event.playerTurn, event.playerList.length, event.playerList]);

  return (
    <>
      <Overlay className="overlay-box" isOpen={event.isFinishGameOverlayOpen} src={deleteIcon}>
        <div className="finish-game-overlay">
          <p className="overlay-heading">Continue Game?</p>
          <div>
            <Button
              label="Finish"
              isLink
              handleClick={functions.sortPlayer}
              type="secondary"
              isInverted={true}
              link={""}
            />
            <Button
              label="Continue"
              handleClick={() => {
                functions.handlePlayerFinishTurn();
                updateEvent({ isFinishGameOverlayOpen: false });
              }}
              type="primary"
              link={""}
            />
            <LinkButton
              icon={Undo}
              label="Undo Throw"
              handleClick={() => {
                updateEvent({ isFinishGameOverlayOpen: false });
                functions.handleUndo();
              }}
              className="undo-throw"
            />
          </div>
        </div>
      </Overlay>

      <Overlay
        className="overlay-box"
        src={deleteIcon}
        isOpen={event.isSettingsOverlayOpen}
        onClose={() => {
          updateEvent({ isSettingsOverlayOpen: false });
        }}
      >
        <div className="settings-overlay">
          <h3 className="overlay-headline">Settings</h3>
          <div className="settings-body-container">
            <SettingsGroupBtn
              title="Game Mode"
              options={[
                { label: "Single-out", id: "single-out" },
                { label: "Double-out", id: "double-out" },
                { label: "Triple-out", id: "triple-out" },
              ]}
              selectedId={event.selectedGameMode}
              onClick={functions.handleGameModeClick}
            />
            <SettingsGroupBtn
              title="Punkte"
              options={[
                { label: "101", id: 101 },
                { label: "201", id: 201 },
                { label: "301", id: 301 },
                { label: "401", id: 401 },
                { label: "501", id: 501 },
              ]}
              selectedId={event.selectedPoints}
              onClick={functions.handlePointsClick}
            />
          </div>
          <Button
            className="settingsOverlayBtn"
            type="primary"
            label="Save"
            handleClick={() => {
              window.location.reload();
            }}
            link={""}
          />
        </div>
      </Overlay>

      <div className="gamePageHeader">
        <Link to="/" className="top">
          <img src={Back} alt="Back to Home" />
        </Link>
      </div>
      <div className="game-player-item-container">
        <GamePlayerItemList
          userMap={event.playerList}
          score={event.playerList[event.playerTurn]?.score}
          round={event.roundsCount}
          isBust={event.playerList[event.playerTurn]?.isBust}
          throwCount={event.playerList[event.playerTurn]?.throwCount}
        />
        <FinishedGamePlayerItemList userMap={event.finishedPlayerList} />
      </div>
      <div className="keyboard-and-undo">
        <NumberButton value="Undo" handleClick={functions.handleUndo} />
        <Keyboard
          handleClick={(value) =>
            functions.handleThrow(event.playerList[event.playerTurn], event.throwCount, value)
          }
          isOverlayOpen={event.isFinishGameOverlayOpen}
        />
      </div>
      <LinkButton
        className="settings-btn"
        label={<img src={settingsIcon} alt="Settings" />}
        handleClick={() => updateEvent({ isSettingsOverlayOpen: true })}
      />
    </>
  );
}
export default Game;
