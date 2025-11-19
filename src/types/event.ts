// types/event.ts
export type Player = {
  id: number;
  name: string;
  isAdded?: boolean;
  isClicked?: number | null;
};

export interface EventState {
  list: Player[];
  selectedPlayers: Player[];
  newPlayer: string;
  isNewPlayerOverlayOpen: boolean;
  errormessage?: string;
  dragEnd?: boolean;
}

export interface UserFunctions {
  initializePlayerList: () => void;

  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  createPlayer: (name: string) => void;
  handleDragEnd: (e: DragEndEvent) => void;
  handleUnselect: (id: number, gameId?: number | null) => void;
  playSound: (soundPath: string) => void;
  resetGame: () => void;
}

export interface UseUserResult {
  event: EventState;
  updateEvent: (patch: Partial<EventState>) => void;
  functions: UserFunctions;
}
