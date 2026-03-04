export interface RoomStreamEvent<T = unknown> {
  type: string;
  data: T;
}

export interface RoomState {
  id: number;
  players: Array<{ id: number; username: string }>;
}
