import { useCallback, useMemo } from "react";
import { useNavigate, useParams, useRevalidator } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { useGamePlayers } from "./useGamePlayers";
import { useCreateStartFlow } from "./useCreateStartFlow";
import { useGuestFlow } from "./useGuestFlow";
import { persistPlayerOrder, usePlayerOrderPersistence } from "./usePlayerOrderPersistence";
import { useStartPageError } from "./useStartPageError";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";
import { $invitation } from "@/shared/store";
import { leaveRoom } from "@/shared/api/room";
import { isGameSeatsNotEditableError, toUserErrorMessage } from "@/lib/error/error-to-user-message";

type GamePlayersResult = ReturnType<typeof useGamePlayers>;

export { persistPlayerOrder };

interface UseStartPageResult {
  invitation: ReturnType<typeof useStore<typeof $invitation>>;
  gameId: number | null;
  players: GamePlayersResult["players"];
  playerCount: number;
  isLobbyFull: boolean;
  playerOrder: number[];
  creating: boolean;
  starting: boolean;
  pageError: string | null;
  isGuestOverlayOpen: boolean;
  guestUsername: string;
  guestError: string | null;
  guestSuggestions: string[];
  isAddingGuest: boolean;
  handleDragEnd: ReturnType<typeof usePlayerOrderPersistence>["handleDragEnd"];
  handleRemovePlayer: (playerId: number, currentGameId: number) => Promise<void>;
  handleStartGame: () => Promise<void>;
  handleCreateRoom: () => Promise<void>;
  clearPageError: () => void;
  openGuestOverlay: () => void;
  closeGuestOverlay: () => void;
  setGuestUsername: (value: string) => void;
  handleGuestSuggestion: (suggestion: string) => void;
  handleAddGuest: () => Promise<void>;
}

/**
 * Composes room restore, order persistence, create/start, guest, and error flows for StartPage.
 */
export function useStartPage(): UseStartPageResult {
  const navigate = useNavigate();
  const { revalidate } = useRevalidator();
  const { id: gameIdParam } = useParams<{ id?: string }>();

  const invitation = useStore($invitation);

  const gameId = useMemo(() => parseRouteGameId(gameIdParam), [gameIdParam]);
  const {
    players,
    count: playerCount,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
  } = useGamePlayers(gameId);

  const { pageError, setPageError, clearPageError } = useStartPageError();
  const { playerOrder, handleDragEnd } = usePlayerOrderPersistence({
    gameId,
    players,
    setPageError,
    onSeatsNotEditable: revalidate,
  });
  const { creating, starting, handleCreateRoom, handleStartGame } = useCreateStartFlow({
    gameId,
    invitationGameId: invitation?.gameId,
    navigate,
    setPageError,
  });
  const {
    isLobbyFull,
    isGuestOverlayOpen,
    guestUsername,
    guestError,
    guestSuggestions,
    isAddingGuest,
    openGuestOverlay,
    closeGuestOverlay,
    setGuestUsername,
    handleGuestSuggestion,
    handleAddGuest,
  } = useGuestFlow({
    gameId,
    playerCount,
    appendOptimisticPlayer,
    onSeatsNotEditable: revalidate,
  });

  const handleRemovePlayer = useCallback(
    async (playerId: number, activeGameId: number): Promise<void> => {
      const removedPlayer = players.find((player) => player.id === playerId);
      removeOptimisticPlayer(playerId);

      try {
        await leaveRoom(activeGameId, playerId);
      } catch (error) {
        if (removedPlayer) {
          appendOptimisticPlayer(removedPlayer);
        }
        setPageError(toUserErrorMessage(error, "Could not remove player. Please try again."));
        if (isGameSeatsNotEditableError(error)) {
          // The game left the lobby: the route loader sends this tab to the game page.
          void revalidate();
        }
      }
    },
    [appendOptimisticPlayer, players, removeOptimisticPlayer, revalidate, setPageError],
  );

  return {
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
  };
}
