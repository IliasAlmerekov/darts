import { useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { useGamePlayers } from "./useGamePlayers";
import { useCreateStartFlow } from "./useCreateStartFlow";
import { useGuestFlow } from "./useGuestFlow";
import { persistPlayerOrder, usePlayerOrderPersistence } from "./usePlayerOrderPersistence";
import { resolveGameId, shouldRedirectToCurrentGame, useRoomRestore } from "./useRoomRestore";
import { useStartPageError } from "./useStartPageError";
import { $currentGameId, $gameSettings, $invitation, $lastFinishedGameId } from "@/store";
import { leaveRoom } from "@/shared/api/room";
import { toUserErrorMessage } from "@/lib/error-to-user-message";

type GamePlayersResult = ReturnType<typeof useGamePlayers>;

type StartPageLatestState = {
  players: GamePlayersResult["players"];
  appendOptimisticPlayer: GamePlayersResult["appendOptimisticPlayer"];
  removeOptimisticPlayer: GamePlayersResult["removeOptimisticPlayer"];
};

export { persistPlayerOrder, resolveGameId, shouldRedirectToCurrentGame };

export type UseStartPageResult = {
  invitation: ReturnType<typeof useStore<typeof $invitation>>;
  gameId: number | null;
  lastFinishedGameId: ReturnType<typeof useStore<typeof $lastFinishedGameId>>;
  players: GamePlayersResult["players"];
  playerCount: number;
  isLobbyFull: boolean;
  playerOrder: number[];
  creating: boolean;
  starting: boolean;
  isRestoring: boolean;
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
};

/**
 * Composes room restore, order persistence, create/start, guest, and error flows for StartPage.
 */
export function useStartPage(): UseStartPageResult {
  const navigate = useNavigate();
  const { id: gameIdParam } = useParams<{ id?: string }>();

  const gameSettings = useStore($gameSettings);
  const lastFinishedGameId = useStore($lastFinishedGameId);
  const invitation = useStore($invitation);
  const currentGameId = useStore($currentGameId);

  const gameId = useMemo(() => resolveGameId(gameIdParam), [gameIdParam]);
  const {
    players,
    count: playerCount,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
  } = useGamePlayers(gameId);

  const { pageError, setPageError, clearPageError } = useStartPageError();
  const { isRestoring } = useRoomRestore({
    gameIdParam,
    gameId,
    invitationGameId: invitation?.gameId,
    currentGameId,
    navigate,
  });
  const { playerOrder, handleDragEnd } = usePlayerOrderPersistence({
    gameId,
    players,
    setPageError,
  });
  const { creating, starting, handleCreateRoom, handleStartGame } = useCreateStartFlow({
    gameId,
    invitationGameId: invitation?.gameId,
    lastFinishedGameId,
    gameSettings,
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
  });

  const latestStateRef = useRef<StartPageLatestState>({
    players,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
  });

  latestStateRef.current = {
    players,
    appendOptimisticPlayer,
    removeOptimisticPlayer,
  };

  const handleRemovePlayer = useCallback(
    async (playerId: number, activeGameId: number): Promise<void> => {
      const { players, removeOptimisticPlayer, appendOptimisticPlayer } = latestStateRef.current;
      const removedPlayer = players.find((player) => player.id === playerId);
      removeOptimisticPlayer(playerId);

      try {
        await leaveRoom(activeGameId, playerId);
      } catch (error) {
        if (removedPlayer) {
          appendOptimisticPlayer(removedPlayer);
        }
        setPageError(toUserErrorMessage(error, "Could not remove player. Please try again."));
      }
    },
    [setPageError],
  );

  return {
    invitation,
    gameId,
    lastFinishedGameId,
    players,
    playerCount,
    isLobbyFull,
    playerOrder,
    creating,
    starting,
    isRestoring,
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
