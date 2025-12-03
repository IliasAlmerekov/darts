import { useEffect, useRef } from "react";
import type { EventState, UserFunctions } from "../types/event";

interface UseInitializePlayersParams {
  event: EventState;
  updateEvent: (path: Partial<EventState>) => void;
  functions: UserFunctions;
}

export function UseInitializePlayers({
  event,
  updateEvent,
  functions,
}: UseInitializePlayersParams) {
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;

    if (event.list?.length === 0) {
      functions.initializePlayerList();
    } else {
      updateEvent({ selectedPlayers: event.list });
    }
  }, [event.list, functions, updateEvent]);
}
