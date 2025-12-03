import styles from "./start.module.css";
import React, { useEffect, useState } from "react";
import { useStore } from "@nanostores/react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import NavigationBar from "../../components/navigation-bar/NavigationBar";
import Plus from "../../icons/plus.svg";
import LinkButton from "../../components/link-button/LinkButton";
import Button from "../../components/button/Button";
import "../../components/button/Button.css";
import QRCode from "../../components/qr-code/QRCode";
import { useRoomInvitation } from "../../hooks/useRoomInvitation";
import { startGame, deletePlayerFromGame } from "../../services/api";
import { LivePlayersList } from "../../components/live-players-list/LivePlayersList";
import { useGamePlayers } from "../../hooks/useGamePlayers";
import { $settings, $lastFinishedGameId, setCurrentGameId } from "../../stores";

function Start(): React.JSX.Element {
  const START_SOUND_PATH = "/sounds/start-round-sound.mp3";
  const frontendBaseUrl = "http://localhost:5173";

  const settings = useStore($settings);
  const lastFinishedGameId = useStore($lastFinishedGameId);

  const { invitation, createRoom } = useRoomInvitation();

  const gameId = invitation?.gameId ?? null;
  const { players, count: playerCount } = useGamePlayers(gameId);
  const [playerOrder, setPlayerOrder] = useState<number[]>([]);

  // Sync player order with fetched players
  useEffect(() => {
    if (players.length > 0) {
      setPlayerOrder(players.map((p) => p.id));
    }
  }, [players]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPlayerOrder((items) => {
        const oldIndex = items.indexOf(active.id as number);
        const newIndex = items.indexOf(over.id as number);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const isDoubleOut = settings.gameMode === "double-out";
  const isTripleOut = settings.gameMode === "triple-out";

  const handleRemovePlayer = async (playerId: number, currentGameId: number) => {
    try {
      await deletePlayerFromGame(currentGameId, playerId);
    } catch (error) {
      console.error("Failed to remove player:", error);
    }
  };

  useEffect(() => {
    if (invitation?.gameId) {
      setCurrentGameId(invitation.gameId);
    }
  }, [invitation?.gameId]);

  const handleStartGame = async () => {
    if (!gameId) return;

    const audio = new Audio(START_SOUND_PATH);
    audio.volume = 0.4;
    audio.play().catch(console.error);

    await startGame(gameId, {
      startScore: settings.points,
      doubleOut: isDoubleOut,
      tripleOut: isTripleOut,
      round: 1,
      status: "started",
    });
  };

  return (
    <div className={styles.main}>
      <div className={styles.start}>
        <NavigationBar />
        <>
          <div className={styles.existingPlayerList}>
            <div className={styles.header}>
              <h4 className={styles.headerUnselectedPlayers}>Login</h4>
            </div>
            <div className={styles.qrCodeSection}>
              {invitation && (
                <QRCode
                  invitationLink={frontendBaseUrl + invitation.invitationLink}
                  gameId={invitation.gameId}
                />
              )}
            </div>
            <div className={styles.bottom}>
              <LinkButton
                className={styles.createNewPlayerButton}
                label={invitation ? "Create New Game" : "Create Game"}
                icon={Plus}
                handleClick={() =>
                  createRoom({
                    previousGameId: lastFinishedGameId ?? undefined,
                  })
                }
              />
            </div>
          </div>

          <div className={styles.addedPlayerList}>
            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext items={playerOrder} strategy={verticalListSortingStrategy}>
                <LivePlayersList
                  gameId={gameId}
                  onRemovePlayer={handleRemovePlayer}
                  dragEnd={false}
                />
              </SortableContext>
            </DndContext>

            <div className={styles.startBtn}>
              <Button
                isLink
                label="Start"
                link="/game"
                disabled={playerCount < 2 || !gameId}
                type="secondary"
                handleClick={handleStartGame}
              />
            </div>
          </div>
        </>
      </div>
    </div>
  );
}

export default Start;
