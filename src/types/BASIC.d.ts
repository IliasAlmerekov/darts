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
    throw1?: number | string;
    throw2?: number | string;
    throw3?: number | string;
    throw1IsBust?: boolean;
    throw2IsBust?: boolean;
    throw3IsBust?: boolean;
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

  type PlayerProps = {
    gamesPlayed?: number;
    scoreAverage?: number;
    id: number;
    name: string;
    playerId?: number;
  };

  type GameDataProps = {
    items?: FinishedGameProps[];
    total?: SetStateAction<number>;
  };

  type PlayerDataProps = {
    items?: PlayerProps[];
    total?: SetStateAction<number>;
  };

  type FinishedGameProps = {
    id: number;
    winnerRounds: number;
    winnerName: string;
    playersCount: number;
    date: string;
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

  interface RematchResponse {
    success: boolean;
    gameId: number;
    invitationLink: string;
  }
}
