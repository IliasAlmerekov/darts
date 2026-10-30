import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useRevalidator } from "react-router-dom";
import { useStore } from "@nanostores/react";
import { useLobbyRoster } from "./useLobbyRoster";
import { useCreateStartFlow } from "./useCreateStartFlow";
import { useGuestFlow } from "./useGuestFlow";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";
import { $invitation } from "@/shared/store";

type GamePlayersResult = ReturnType<typeof useLobbyRoster>;

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
  handleDragEnd: ReturnType<typeof useLobbyRoster>["reorderPlayers"];
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
  const [pageError, setPageError] = useState<string | null>(null);
  const clearPageError = useCallback((): void => setPageError(null), []);
  const {
    players,
    count: playerCount,
    playerOrder,
    addGuest,
    removePlayer: handleRemovePlayer,
    reorderPlayers: handleDragEnd,
  } = useLobbyRoster(gameId, revalidate, setPageError);
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
    addGuest,
  });

  // The loader can send /start/10 to /start (a finished or aborted game) without remounting the
  // page. A message about the old game must not stay on the new route.
  const [shownGameId, setShownGameId] = useState(gameId);
  if (shownGameId !== gameId) {
    setShownGameId(gameId);
    clearPageError();
    closeGuestOverlay();
  }

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
