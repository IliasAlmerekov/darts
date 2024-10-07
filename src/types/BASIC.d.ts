declare namespace BASIC {
    type GamesList = GameProps[]

    type GameProps = {
        isFinished: boolean,
        round: number,
        date: string,
        playerlist: PlayerProps[]
    }

    type UserList = {
        userList?: UserProps[];
    };

    type Round = {
        throw1?: number;
        throw2?: number;
        throw3?: number;
        isRoundBust?: boolean;
    };

    type PlayerProps = {
        id: number;
        name: string;
        score: number;
        isActive: boolean;
        index: number;
        rounds: Round[];
        isPlaying?: boolean;
        isBust?: boolean;
        throwCount?: number;
    };

    type UserProps = {
        id: number;
        name: string;
    };

    type HomeProps = {
        list: UserProps[];
        setList: React.Dispatch<React.SetStateAction<UserProps[]>>;
    };
}
