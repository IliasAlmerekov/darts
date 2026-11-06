import styles from "./StartPage.module.css";
import React from "react";
import clsx from "clsx";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import Plus from "@/assets/icons/plus.svg";
import UserAddIcon from "@/assets/icons/user-add.svg";
import { Button } from "@/shared/ui/button";
import { ErrorState } from "@/shared/ui/error-state";
import QRCode from "./components/qr-code/QRCode";
import { LivePlayersList } from "./components/live-players-list/LivePlayersList";
import { useStartPage } from "./useStartPage";
import GuestPlayerOverlay from "./components/guest-player-overlay/GuestPlayerOverlay";

function toAbsoluteInvitationLink(invitationLink: string): string {
  const normalizedInvitationLink = invitationLink.trim();
  if (!normalizedInvitationLink) {
    return invitationLink;
  }

  try {
    return new URL(normalizedInvitationLink).toString();
  } catch {
    try {
      return new URL(normalizedInvitationLink, window.location.origin).toString();
    } catch {
      return invitationLink;
    }
  }
}

function StartPage(): React.JSX.Element {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const { invitation, gameId, pageError, clearPageError, roster, guest, create } = useStartPage();
  const { remove: removePlayer } = roster;

  const handleDragEnd = ({ active, over }: DragEndEvent): void => {
    if (!over) return;
    const playerId = Number(active.id);
    const overPlayerId = Number(over.id);
    if (Number.isFinite(playerId) && Number.isFinite(overPlayerId))
      roster.reorder(playerId, overPlayerId);
  };

  const handleRemovePlayerFromList = React.useCallback(
    (playerId: number): void => {
      void removePlayer(playerId);
    },
    [removePlayer],
  );

  const createGameButton = (
    <Button
      label={invitation ? "Created" : "Create Game"}
      iconSrc={Plus}
      type="primary"
      handleClick={create.handleCreateRoom}
      disabled={!!invitation || create.creating}
      {...(styles.createNewPlayerButton !== undefined
        ? { className: styles.createNewPlayerButton }
        : {})}
      {...(styles.createGameIcon !== undefined ? { iconStyling: styles.createGameIcon } : {})}
    />
  );

  const mobileCreateGameButton = invitation ? null : (
    <div className={styles.mobileActionCreate}>
      <Button
        label="Create Game"
        iconSrc={Plus}
        type="primary"
        handleClick={create.handleCreateRoom}
        disabled={create.creating}
        {...(styles.createNewPlayerButton !== undefined
          ? { className: styles.createNewPlayerButton }
          : {})}
        {...(styles.createGameIcon !== undefined ? { iconStyling: styles.createGameIcon } : {})}
      />
    </div>
  );

  const mobileActionRow = (
    <div className={styles.mobileActionRow}>
      <div className={styles.mobileActionStart}>
        <Button
          label="Start"
          disabled={create.starting || roster.count < 2 || gameId === null}
          type="secondary"
          handleClick={create.handleStartGame}
          {...(styles.startButton !== undefined ? { className: styles.startButton } : {})}
        />
      </div>
      {invitation && (
        <div className={styles.mobileActionGuest}>
          <button
            type="button"
            className={styles.guestButtonMobile}
            onClick={guest.openGuestOverlay}
            disabled={gameId === null || guest.isLobbyFull}
            aria-label="Play as a guest"
            title={
              guest.isLobbyFull ? "The lobby is full. Remove a player to add another." : undefined
            }
          >
            <img src={UserAddIcon} alt="Play as a guest" className={styles.guestButtonIcon} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
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
                    isLobbyFull={guest.isLobbyFull}
                  />
                </div>
              ) : null}
            </div>
            <div className={styles.bottom}>{createGameButton}</div>
          </div>

          <div className={styles.addedPlayerList}>
            <div className={styles.playersListArea}>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
              >
                <SortableContext items={roster.order} strategy={verticalListSortingStrategy}>
                  <LivePlayersList
                    players={roster.seats}
                    playerCount={roster.count}
                    onRemovePlayer={handleRemovePlayerFromList}
                    dragEnd={false}
                    maxPlayers={10}
                  />
                </SortableContext>
              </DndContext>
            </div>

            <div
              className={clsx(styles.startBtn, {
                [styles.startBtnScrolled ?? ""]: roster.count > 5,
              })}
            >
              {mobileCreateGameButton}
              {mobileActionRow}
            </div>
          </div>
        </div>
      </div>
      <GuestPlayerOverlay
        isOpen={guest.isGuestOverlayOpen}
        username={guest.guestUsername}
        onUsernameChange={guest.setGuestUsername}
        onAdd={guest.handleAddGuest}
        onClose={guest.closeGuestOverlay}
        isAdding={guest.isAddingGuest}
        error={guest.guestError}
        suggestions={guest.guestSuggestions}
        onSuggestionClick={guest.handleGuestSuggestion}
      />
    </>
  );
}

export default StartPage;
