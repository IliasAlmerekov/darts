import styles from "./StartPage.module.css";
import React from "react";
import { useStore } from "@nanostores/react";
import clsx from "clsx";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { AdminLayout } from "@/shared/ui/admin-layout";
import Plus from "@/assets/icons/plus.svg";
import Button from "@/shared/ui/button/Button";
import { ErrorState } from "@/shared/ui/error-state";
import { API_BASE_URL } from "@/shared/api";
import QRCode from "./components/qr-code/QRCode";
import { LivePlayersList } from "./components/live-players-list/LivePlayersList";
import { useStartPage } from "./useStartPage";
import { $currentGameId } from "@/store";
import GuestPlayerOverlay from "./components/guest-player-overlay/GuestPlayerOverlay";

function toAbsoluteInvitationLink(invitationLink: string): string {
  try {
    const apiOrigin = new URL(API_BASE_URL, window.location.origin).origin;
    return new URL(invitationLink, apiOrigin).toString();
  } catch {
    return invitationLink;
  }
}

function StartPage(): React.JSX.Element {
  const currentGameId = useStore($currentGameId);
  const {
    invitation,
    gameId,
    players,
    playerCount,
    isLobbyFull,
    playerOrder,
    creating,
    starting,
    pageError,
    isGuestOverlayOpen,
    guestUsername,
    guestError,
    guestSuggestions,
    isAddingGuest,
    handleDragEnd,
    handleRemovePlayer,
    handleStartGame,
    handleCreateRoom,
    clearPageError,
    openGuestOverlay,
    closeGuestOverlay,
    setGuestUsername,
    handleGuestSuggestion,
    handleAddGuest,
  } = useStartPage();

  const createGameButton = (
    <Button
      className={styles.createNewPlayerButton}
      label={invitation ? "Created" : "Create Game"}
      iconSrc={Plus}
      iconStyling={styles.createGameIcon}
      type="primary"
      handleClick={handleCreateRoom}
      disabled={!!invitation || creating}
    />
  );

  const mobileCreateGameButton = invitation ? null : (
    <div className={styles.mobileActionCreate}>
      <Button
        className={styles.createNewPlayerButton}
        label="Create Game"
        iconSrc={Plus}
        iconStyling={styles.createGameIcon}
        type="primary"
        handleClick={handleCreateRoom}
        disabled={creating}
      />
    </div>
  );

  const mobileActionRow = (
    <div className={styles.mobileActionRow}>
      <div className={styles.mobileActionStart}>
        <Button
          label="Start"
          disabled={starting || playerCount < 2 || !gameId}
          type="secondary"
          className={styles.startButton}
          handleClick={handleStartGame}
        />
      </div>
      {invitation && (
        <div className={styles.mobileActionGuest}>
          <button
            type="button"
            className={styles.guestButtonMobile}
            onClick={openGuestOverlay}
            disabled={!gameId || isLobbyFull}
            aria-label="Play as a guest"
            title={isLobbyFull ? "The lobby is full. Remove a player to add another." : undefined}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.guestButtonIcon}
              aria-hidden="true"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" x2="19" y1="8" y2="14" />
              <line x1="22" x2="16" y1="11" y2="11" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout currentGameId={currentGameId}>
      <div className={styles.main}>
        {pageError ? (
          <div className={styles.pageError}>
            <ErrorState
              title="Start page action failed"
              message={pageError}
              primaryAction={{ label: "Dismiss", onClick: clearPageError }}
            />
          </div>
        ) : null}
        <div className={styles.start}>
          <div className={styles.existingPlayerList}>
            <div className={styles.qrCodeSection}>
              {invitation ? (
                <div className={styles.qrCodeStack}>
                  <QRCode
                    invitationLink={toAbsoluteInvitationLink(invitation.invitationLink)}
                    gameId={invitation.gameId}
                    isLobbyFull={isLobbyFull}
                  />
                </div>
              ) : null}
            </div>
            <div className={styles.bottom}>{createGameButton}</div>
          </div>

          <div className={styles.addedPlayerList}>
            <div className={styles.playersListArea}>
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={playerOrder} strategy={verticalListSortingStrategy}>
                  <LivePlayersList
                    gameId={gameId}
                    players={players}
                    playerCount={playerCount}
                    onRemovePlayer={handleRemovePlayer}
                    dragEnd={false}
                    playerOrder={playerOrder}
                    maxPlayers={10}
                  />
                </SortableContext>
              </DndContext>
            </div>

            <div
              className={clsx(styles.startBtn, {
                [styles.startBtnScrolled ?? ""]: playerCount > 5,
              })}
            >
              {mobileCreateGameButton}
              {mobileActionRow}
            </div>
          </div>
        </div>
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
    </AdminLayout>
  );
}

export default StartPage;
