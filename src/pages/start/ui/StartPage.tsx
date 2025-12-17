import styles from "./StartPage.module.css";
import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import NavigationBar from "../../../widgets/navigation-bar/NavigationBar";
import Plus from "../../../icons/plus.svg";
import LinkButton from "../../../components/link-button/LinkButton";
import Button from "@/shared/ui/button/Button";
import QRCode from "../../../components/qr-code/QRCode";
import { LivePlayersList } from "../../../components/live-players-list/LivePlayersList";
import { useStartPage } from "../model";

const FRONTEND_BASE_URL = "http://localhost:5173";

function StartPage(): React.JSX.Element {
  const {
    invitation,
    gameId,
    lastFinishedGameId,
    playerCount,
    playerOrder,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
  } = useStartPage();

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
                  invitationLink={FRONTEND_BASE_URL + invitation.invitationLink}
                  gameId={invitation.gameId}
                />
              )}
            </div>
            <div className={styles.bottom}>
              <LinkButton
                className={styles.createNewPlayerButton}
                label={invitation ? "Create New Game" : "Create Game"}
                icon={Plus}
                handleClick={handleCreateRoom}
                disabled={!!invitation}
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
                  previousGameId={lastFinishedGameId}
                  onRemovePlayer={handleRemovePlayer}
                  dragEnd={false}
                  playerOrder={playerOrder}
                />
              </SortableContext>
            </DndContext>

            <div className={styles.startBtn}>
              <Button
                isLink
                label="Start"
                link={gameId ? `/game/${gameId}` : "/start"}
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

export default StartPage;
