import styles from "./StartPage.module.css";
import React from "react";
import clsx from "clsx";
import { DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { AdminLayout } from "@/components/admin-layout";
import Plus from "@/assets/icons/plus.svg";
import LinkButton from "@/components/link-button/LinkButton";
import Button from "@/components/button/Button";
import { ErrorState } from "@/components/error-state";
import QRCode from "../components/qr-code/QRCode";
import { LivePlayersList } from "../components/live-players-list/LivePlayersList";
import { useStartPage } from "../hooks/useStartPage";
import GuestPlayerOverlay from "../components/guest-player-overlay/GuestPlayerOverlay";

function toAbsoluteInvitationLink(invitationLink: string): string {
  try {
    return new URL(invitationLink, window.location.origin).toString();
  } catch {
    return invitationLink;
  }
}

function StartPage(): React.JSX.Element {
  const {
    invitation,
    gameId,
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

  return (
    <AdminLayout>
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
                  ></QRCode>
                </div>
              ) : (
                <div className={styles.mobileCreateButtonWrapper}>
                  <LinkButton
                    className={styles.createNewPlayerButton}
                    label="Create Game"
                    icon={Plus}
                    handleClick={handleCreateRoom}
                    disabled={creating}
                  />
                </div>
              )}
            </div>
            <div className={styles.bottom}>
              <LinkButton
                className={styles.createNewPlayerButton}
                label={invitation ? "Created" : "Create Game"}
                icon={Plus}
                handleClick={handleCreateRoom}
                disabled={!!invitation || creating}
              />
            </div>
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
                [styles.startBtnScrolled]: playerCount > 5,
              })}
            >
              <div className={styles.mobileActionRow}>
                <div className={styles.mobileActionStart}>
                  <Button
                    label={starting ? "Starting..." : "Start"}
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
                      title={
                        isLobbyFull
                          ? "The lobby is full. Remove a player to add another."
                          : undefined
                      }
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
