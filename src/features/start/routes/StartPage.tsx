import styles from "./StartPage.module.css";
import React from "react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import NavigationBar from "@/components/navigation-bar/NavigationBar";
import Plus from "@/assets/icons/plus.svg";
import LinkButton from "@/components/link-button/LinkButton";
import Button from "@/components/button/Button";
import QRCode from "../components/qr-code/QRCode";
import { LivePlayersList } from "../components/live-players-list/LivePlayersList";
import { useStartPage } from "../hooks/useStartPage";
import GuestPlayerOverlay from "../components/guest-player-overlay/GuestPlayerOverlay";

const FRONTEND_BASE_URL = "http://localhost:5173";

function StartPage(): React.JSX.Element {
  const {
    invitation,
    gameId,
    lastFinishedGameId,
    playerCount,
    playerOrder,
    isGuestOverlayOpen,
    guestUsername,
    guestError,
    guestSuggestions,
    isAddingGuest,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
    openGuestOverlay,
    closeGuestOverlay,
    setGuestUsername,
    handleGuestSuggestion,
    handleAddGuest,
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
                <div className={styles.qrCodeStack}>
                  <QRCode
                    invitationLink={FRONTEND_BASE_URL + invitation.invitationLink}
                    gameId={invitation.gameId}
                  />
                  <div className={styles.guestButtonRow}>
                    <Button
                      type="secondary"
                      label="Play as a guest"
                      className={styles.guestButton}
                      handleClick={openGuestOverlay}
                      disabled={!gameId}
                    />
                  </div>
                </div>
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
      <GuestPlayerOverlay
        isOpen={isGuestOverlayOpen}
        username={guestUsername}
        onUsernameChange={setGuestUsername}
        onAdd={handleAddGuest}
        onClose={closeGuestOverlay}
        isAdding={isAddingGuest}
        error={guestError}
        suggestions={guestSuggestions}
        onSuggestionClick={handleGuestSuggestion}
      />
    </div>
  );
}

export default StartPage;
