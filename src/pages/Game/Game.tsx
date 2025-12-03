import Keyboard from "../../components/Keyboard/Keyboard";
import styles from "./Game.module.css";
import Back from "../../icons/back.svg";
import { Link } from "react-router-dom";
import GamePlayerItemList from "../../components/game-player-item/GamplayerItemList";
import Overlay from "../../components/Overlay/Overlay";
import Button from "../../components/Button/Button";
import NumberButton from "../../components/keyboard/NumberButton";
import FinishedGamePlayerItemList from "../../components/game-player-item/FinishedGamePlayerItemList";
import LinkButton from "../../components/link-button/LinkButton";
import deleteIcon from "../../icons/delete.svg";
import Undo from "../../icons/undo-copy.svg";
import settingsIcon from "../../icons/settings-inactive.svg";
import SettingsGroupBtn from "../../components/Button/SettingsGroupBtn";
import { useRoomInvitation } from "../../hooks/useRoomInvitation";
import { useGameState } from "../../hooks/useGameState";
import { useThrowHandler } from "../../features/game/hooks/useThrowHandler";

function Game() {
  const { invitation } = useRoomInvitation();
  const gameId = invitation?.gameId ?? null;

  // Load game state - this syncs with nanostores internally
  const { gameData } = useGameState({ gameId });

  // Throw handlers - now use nanostores directly
  const { handleThrow, handleUndo } = useThrowHandler({ gameId });

  return (
    <>
      <Overlay
        className={styles.overlayBox}
        //isOpen={event.isFinishGameOverlayOpen}
        src={deleteIcon}
      >
        <div className={styles.finishGameOverlay}>
          <p className={styles.overlayHeading}>Continue Game?</p>
          <div>
            <Button
              label="Finish"
              isLink
              //handleClick={functions.sortPlayer}
              type="secondary"
              isInverted={true}
              link={""}
            />
            <Button
              label="Continue"
              handleClick={() => {
                //functions.handlePlayerFinishTurn();
                //updateEvent({ isFinishGameOverlayOpen: false });
              }}
              type="primary"
              link={""}
            />
            <LinkButton
              icon={Undo}
              label="Undo Throw"
              handleClick={() => {
                //updateEvent({ isFinishGameOverlayOpen: false });
                //functions.handleUndo();
              }}
              className={styles.undoThrow}
            />
          </div>
        </div>
      </Overlay>

      <Overlay
        className={styles.overlayBox}
        src={deleteIcon}
        //isOpen={event.isSettingsOverlayOpen}
        onClose={() => {
          //updateEvent({ isSettingsOverlayOpen: false });
        }}
      >
        <div className={styles.settingsOverlay}>
          <h3 className={styles.overlayHeadline}>Settings</h3>
          <div className={styles.settingsBodyContainer}>
            <SettingsGroupBtn
              title="Game Mode"
              options={[
                { label: "Single-out", id: "single-out" },
                { label: "Double-out", id: "double-out" },
                { label: "Triple-out", id: "triple-out" },
              ]}
              // selectedId={event.selectedGameMode}
              selectedId={
                gameData?.settings.doubleOut
                  ? "double-out"
                  : gameData?.settings.tripleOut
                    ? "triple-out"
                    : "single-out"
              }
              // onClick={functions.handleGameModeClick}
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
              // selectedId={event.selectedPoints}
              selectedId={gameData?.settings.startScore}
              // onClick={functions.handlePointsClick}
            />
          </div>
          <Button
            className={styles.settingsOverlayBtn}
            type="primary"
            label="Save"
            handleClick={() => {
              window.location.reload();
            }}
            link={""}
          />
        </div>
      </Overlay>

      <div className={styles.gamePageHeader}>
        <Link to="/start" className={styles.top}>
          <img src={Back} alt="Back to Home" />
        </Link>
      </div>
      <div className={styles.gamePlayerItemContainer}>
        {gameData && (
          <>
            <GamePlayerItemList
              userMap={gameData.players.map((player, index) => {
                // Convert backend roundHistory format to UI Round format
                const previousRounds: BASIC.Round[] =
                  (
                    player.roundHistory as Array<{
                      round: number;
                      throws: Array<{
                        value: number;
                        isDouble: boolean;
                        isTriple: boolean;
                        isBust: boolean;
                      }>;
                    }>
                  )?.map((roundData) => {
                    const throws = roundData.throws || [];
                    return {
                      throw1: throws[0]?.value,
                      throw2: throws[1]?.value,
                      throw3: throws[2]?.value,
                    };
                  }) || [];

                // Convert currentRoundThrows to the round format expected by UI
                const currentRoundData: BASIC.Round = {
                  throw1: player.currentRoundThrows?.[0]?.value,
                  throw2: player.currentRoundThrows?.[1]?.value,
                  throw3: player.currentRoundThrows?.[2]?.value,
                };

                // Build rounds array: previous rounds from history + current round
                const rounds = [...previousRounds, currentRoundData];

                return {
                  ...player,
                  index,
                  rounds,
                };
              })}
              score={
                gameData.players.find((player) => player.id === gameData.activePlayerId)?.score || 0
              }
              round={gameData.currentRound}
              isBust={
                gameData.players.find((player) => player.id === gameData.activePlayerId)?.isBust ||
                false
              }
              throwCount={gameData.currentThrowCount}
            />
            <FinishedGamePlayerItemList
              // Backend returns winnerId and position in players array
              userMap={
                gameData.status === "finished"
                  ? gameData.players
                      .filter((p) => p.position > 0)
                      .sort((a, b) => a.position - b.position)
                  : []
              }
            />
          </>
        )}
      </div>
      <div className={styles.keyboardAndUndo}>
        <NumberButton value="Undo" handleClick={handleUndo} />
        <Keyboard handleClick={handleThrow} />
      </div>
      <LinkButton
        className={styles.settingsBtn}
        label={<img src={settingsIcon} alt="Settings" />}
        //handleClick={() => updateEvent({ isSettingsOverlayOpen: true })}
      />
    </>
  );
}
export default Game;
