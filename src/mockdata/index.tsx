export const mockUserList = [
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

export const mockGamesList = [
    {

        finished: true,
        round: 6,
        date: " 2024-09-05T09:10:27+00:00",
        player1: {
            ...mockUserList[0],
            score: 0,
        },
        player2: {
            ...mockUserList[1],
            score: 0,
        },
        player3: {
            ...mockUserList[2],
            score: 100,
        },
        player4: {
            ...mockUserList[3],
            score: 201,
        }

    },
    {

        finished: true,
        date: " 2024-09-05T09:10:27+00:00",
        round: 5,
        player1: {
            ...mockUserList[0],
            score: 90,
        },
        player2: {
            ...mockUserList[1],
            score: 4,
        },
        player3: {
            ...mockUserList[2],
            score: 0,
        },
        player4: {
            ...mockUserList[3],
            score: 31,
        }


    },
    {

        finished: false,
        date: " 2024-09-05T09:10:27+00:00",
        round: 1,
        player1: {
            ...mockUserList[0],
            score: 103,
        },
        player2: {
            ...mockUserList[1],
            score: 102,
        },
        player3: {
            ...mockUserList[2],
            score: 245,
        },
        player4: {
            ...mockUserList[3],
            score: 34,
        }


    },
    {

        finished: false,
        date: " 2024-09-05T09:10:27+00:00",
        round: 4,
        player1: {
            ...mockUserList[0],
            score: 67,
        },
        player2: {
            ...mockUserList[1],
            score: 2,
        },
        player3: {
            ...mockUserList[2],
            score: 15,
        },
        player4: {
            ...mockUserList[3],
            score: 35,
        }


    },
    {

        finished: false,
        date: " 2024-09-05T09:10:27+00:00",
        round: 2,
        player1: {
            ...mockUserList[0],
            score: 120,
        },
        player2: {
            ...mockUserList[1],
            score: 186,
        },
        player3: {
            ...mockUserList[2],
            score: 290,
        },
        player4: {
            ...mockUserList[3],
            score: 201,
        }

    },
]