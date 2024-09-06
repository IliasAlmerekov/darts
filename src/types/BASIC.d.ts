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
        throw1: undefined | number;
        throw2: undefined | number;
        throw3: undefined | number;
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
