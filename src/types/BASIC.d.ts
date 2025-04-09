declare namespace BASIC {
  type GamesList = GameProps[];

  type GameProps = {
    isFinished: boolean;
    round: number;
    date: string;
    playerlist: PlayerProps[];
  };

  type UserList = {
    userList?: UserProps[];
  };

  type Round = {
    throw1?: number;
    throw2?: number;
    throw3?: number;
    isRoundBust?: boolean;
  };

  type WinnerPlayerProps = {
    id: number;
    name: string;
    score: number;
    isActive: boolean;
    index: number;
    rounds: Round[];
    isPlaying?: boolean;
    isBust?: boolean;
    throwCount?: number;
    scoreAverage?: number;
    roundCount?: number;
  };

  type UserProps = {
    id: number;
    name: string;
  };

  type HomeProps = {
    list: UserProps[];
    setList: React.Dispatch<React.SetStateAction<UserProps[]>>;
  };

  interface GameState {
    finishedPlayerList: BASIC.WinnerPlayerProps[];
    playerList: BASIC.WinnerPlayerProps[];
    playerScore: number;
    roundsCount: number;
    throwCount: number;
    playerTurn: number;
  }
}
