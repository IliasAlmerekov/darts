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
];

export const mockGamesList = [
    {
        game1: {
            finished: true,
            round: 6,
            date: " 2024-09-05T09:10:27+00:00",
            player1: {
                mockUserList,
                score: 0,
            },
            player2: {
                mockUserList,
                score: 0,
            },
            player3: {
                mockUserList,
                score: 100,
            },
            player4: {
                mockUserList,
                score: 201,
            }
        }

    },
    {
        game2: {
            finished: true,
            date: " 2024-09-05T09:10:27+00:00",
            round: 5,
            player1: {
                mockUserList,
                score: 90,
            },
            player2: {
                mockUserList,
                score: 4,
            },
            player3: {
                mockUserList,
                score: 0,
            },
            player4: {
                mockUserList,
                score: 31,
            }
        }

    },
    {
        game3: {
            finished: false,
            date: " 2024-09-05T09:10:27+00:00",
            round: 1,
            player1: {
                mockUserList,
                score: 103,
            },
            player2: {
                mockUserList,
                score: 102,
            },
            player3: {
                mockUserList,
                score: 245,
            },
            player4: {
                mockUserList,
                score: 34,
            }
        }

    },
    {
        game4: {
            finished: false,
            date: " 2024-09-05T09:10:27+00:00",
            round: 4,
            player1: {
                mockUserList,
                score: 67,
            },
            player2: {
                mockUserList,
                score: 2,
            },
            player3: {
                mockUserList,
                score: 15,
            },
            player4: {
                mockUserList,
                score: 35,
            }
        }

    },
    {
        game5: {
            finished: false,
            date: " 2024-09-05T09:10:27+00:00",
            round: 2,
            player1: {
                mockUserList,
                score: 120,
            },
            player2: {
                mockUserList,
                score: 186,
            },
            player3: {
                mockUserList,
                score: 290,
            },
            player4: {
                mockUserList,
                score: 201,
            }
        }

    },
]