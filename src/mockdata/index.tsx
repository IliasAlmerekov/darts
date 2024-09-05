export const mockUserList: BASIC.UserProps[] = [
    {
        id: 1,
        name: "Player 1",
    },
    {
        id: 2,
        name: "Player 2",
    }, {
        id: 3,
        name: "Player 3",
    },
    {
        id: 4,
        name: "Player 4",
    }
];



export const mockGamesList: BASIC.GamesList = [
    {

        isFinished: true,
        round: 6,
        date: "2024-09-05T09:10:27+00:00",
        playerlist: [
            {
                id: 1,
                name: "Hugh",
                score: 50,
                isActive: true,
                index: 0,
                rounds: [],
            },
            {
                id: 2,
                name: "Norman",
                score: 0,
                isActive: false,
                index: 1,
                rounds: [],
            }
        ]

    },
    {

        isFinished: false,
        round: 2,
        date: "2024-09-05T09:10:27+00:00",
        playerlist: [
            {
                id: 1,
                name: "Hugh",
                score: 50,
                isActive: true,
                index: 0,
                rounds: [],
            },
            {
                id: 2,
                name: "Norman",
                score: 220,
                isActive: false,
                index: 1,
                rounds: [],
            }
        ]

    },
]