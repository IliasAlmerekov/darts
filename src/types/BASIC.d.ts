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
        throw1: undefined | number | any;
        throw2: undefined | number | any;
        throw3: undefined | number | any;
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
