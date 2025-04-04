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
import { newSettings } from "../../stores/settings";
import { useUser } from "../../provider/UserProvider";

function Game() {
  const { event, updateEvent, functions } = useUser();

  const navigate = useNavigate();

  const WIN_SOUND_PATH = "/sounds/win-sound.mp3";

  useEffect(() => {
    if (event.throwCount === 3 && !event.isFinishGameOverlayOpen) {
      functions.changeActivePlayer();
    }
  }, [event.throwCount, event.isFinishGameOverlayOpen, functions]);

  useEffect(() => {
    if (event.finishedPlayerList.length === event.list.length) {
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

    if (
      event.playerTurn === 5 ||
      event.playerTurn + 1 === event.playerList.length
    ) {
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
      <Overlay
        className="overlayBox"
        isOpen={event.isFinishGameOverlayOpen}
        src={deleteIcon}
      >
        <div className="finishGameOverlay">
          <p className="overlayHeading">Continue Game?</p>
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
              className="undoThrow"
            />
          </div>
        </div>
      </Overlay>

      <Overlay
        className="overlayBox"
        src={deleteIcon}
        isOpen={event.isSettingsOverlayOpen}
        onClose={() => {
          updateEvent({ isSettingsOverlayOpen: false });
        }}
      >
        <div className="settingsOverlay">
          <p className="overlayHeading">Settings</p>

          <div className="overlayBody">
            <div className="settingsContainer">
              <div>Game Mode</div>
              <div className="buttonContainer">
                <button
                  className={`${
                    event.selectedGameMode === "single-out" ? "active" : ""
                  }`}
                  onClick={() => functions.handleGameModeClick("single-out")}
                >
                  Single-out
                </button>
                <button
                  className={`${
                    event.selectedGameMode === "double-out" ? "active" : ""
                  }`}
                  onClick={() => functions.handleGameModeClick("double-out")}
                >
                  Double-out
                </button>
                <button
                  className={`${
                    event.selectedGameMode === "triple-out" ? "active" : ""
                  }`}
                  onClick={() => functions.handleGameModeClick("triple-out")}
                >
                  Triple-out
                </button>
              </div>
            </div>
            <div className="settingsContainer">
              <div>Punkte</div>
              <div className="buttonContainer">
                <button
                  className={`${event.selectedPoints === 101 ? "active" : ""}`}
                  onClick={() => functions.handlePointsClick(101)}
                >
                  101
                </button>
                <button
                  className={`${event.selectedPoints === 201 ? "active" : ""}`}
                  onClick={() => functions.handlePointsClick(201)}
                >
                  201
                </button>
                <button
                  className={`${event.selectedPoints === 301 ? "active" : ""}`}
                  onClick={() => functions.handlePointsClick(301)}
                >
                  301
                </button>
                <button
                  className={`${event.selectedPoints === 401 ? "active" : ""}`}
                  onClick={() => functions.handlePointsClick(401)}
                >
                  401
                </button>
                <button
                  className={`${event.selectedPoints === 501 ? "active" : ""}`}
                  onClick={() => functions.handlePointsClick(501)}
                >
                  501
                </button>
              </div>
            </div>
          </div>
          <Button
            className="settingsOverlayBtn"
            type="primary"
            label="Save"
            handleClick={() => {
              newSettings(event.selectedGameMode, event.selectedPoints);
              console.log("test", event.selectedGameMode, event.selectedPoints);
              updateEvent({ isSettingsOverlayOpen: false });
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
      <div className="gamePlayerItemContainer">
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
            functions.handleThrow(
              event.playerList[event.playerTurn],
              event.throwCount,
              value
            )
          }
          isOverlayOpen={event.isFinishGameOverlayOpen}
        />
      </div>
      <LinkButton
        className="settingsBtn"
        label="Settings"
        handleClick={() => updateEvent({ isSettingsOverlayOpen: true })}
      />
    </>
  );
}
export default Game;
