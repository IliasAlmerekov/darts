import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams, useRevalidator } from "react-router-dom";
import { useStore } from "@nanostores/react";
import type { Seat } from "@/lib/game/roster";
import { useRoster } from "./roster/useRoster";
import { useCreateStartFlow, type UseCreateStartFlowResult } from "./create/useCreateStartFlow";
import { useGuestFlow, type UseGuestFlowResult } from "./guest/useGuestFlow";
import { parseRouteGameId } from "@/lib/router/tabletGameRoute";
import { $invitation } from "@/shared/store";

/** The lobby seats as the page shows them, with the actions that change them. */
interface StartPageRoster {
  seats: Seat[];
  count: number;
  order: number[];
  reorder: (playerId: number, overPlayerId: number) => void;
  remove: (playerId: number) => Promise<void>;
}

interface UseStartPageResult {
  invitation: ReturnType<typeof useStore<typeof $invitation>>;
  gameId: number | null;
  pageError: string | null;
  clearPageError: () => void;
  roster: StartPageRoster;
  guest: UseGuestFlowResult;
  create: UseCreateStartFlowResult;
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
  const { seats, add, remove, reorder } = useRoster(gameId, {
    onStreamClosed: revalidate,
    onError: setPageError,
  });
  const create = useCreateStartFlow({
    gameId,
    invitationGameId: invitation?.gameId,
    navigate,
    setPageError,
  });
  const guest = useGuestFlow({
    gameId,
    playerCount: seats.length,
    addGuest: (username) => add({ username }),
  });

  // The loader can send /start/10 to /start (a finished or aborted game) without remounting the
  // page. A message about the old game must not stay on the new route.
  const [shownGameId, setShownGameId] = useState(gameId);
  if (shownGameId !== gameId) {
    setShownGameId(gameId);
    clearPageError();
    guest.closeGuestOverlay();
  }

  return {
    invitation,
    gameId,
    pageError,
    clearPageError,
    roster: {
      seats,
      count: seats.length,
      order: seats.map(({ id }) => id),
      reorder,
      remove,
    },
    guest,
    create,
  };
}
