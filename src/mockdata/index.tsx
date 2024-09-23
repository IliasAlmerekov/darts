export const mockUserList: BASIC.UserProps[] = [
    {
        id: 1,
        name: "Norman",
    },
    {
        id: 2,
        name: "Max",
    }, {
        id: 3,
        name: "Jörg",
    },
    {
        id: 4,
        name: "Tobias",
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
                score: 74,
                isActive: true,
                index: 0,
                rounds: [
                    {
                        "throw1": 5,
                        "throw2": 6,
                        "throw3": 4
                    },
                    {
                        "throw1": 20,
                        "throw2": 25,
                        "throw3": 10
                    },
                    {
                        "throw1": 10,
                        "throw2": 13,
                        "throw3": 11
                    },
                    {
                        "throw1": 50,
                        "throw2": 25,
                        "throw3": 0
                    },
                    {
                        "throw1": 25,
                        "throw2": 20,
                        "throw3": 14

                    },
                ],
            },
            {
                id: 2,
                name: "Norman",
                score: 0,
                isActive: false,
                index: 1,
                rounds: [
                    {
                        "throw1": 20,
                        "throw2": 11,
                        "throw3": 3
                    },
                    {
                        "throw1": 20,
                        "throw2": 15,
                        "throw3": 10
                    },
                    {
                        "throw1": 20,
                        "throw2": 20,
                        "throw3": 20
                    },
                    {
                        "throw1": 18,
                        "throw2": 25,
                        "throw3": 7
                    },
                    {
                        "throw1": 25,
                        "throw2": 20,
                        "throw3": 10
                    },
                    {
                        "throw1": 20,
                        "throw2": 17,
                        "throw3": 20
                    },
                ],
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
                score: 260,
                isActive: true,
                index: 0,
                rounds: [
                    {
                        "throw1": 20,
                        "throw2": 11,
                        "throw3": 3
                    },
                    {
                        "throw1": 5,
                        "throw2": 2,
                        "throw3": 0
                    },
                ],
            },
            {
                id: 2,
                name: "Norman",
                score: 290,
                isActive: false,
                index: 1,
                rounds: [
                    {
                        "throw1": 8,
                        "throw2": 6,
                        "throw3": 7
                    },
                ],
            }
        ]

    },
    {

        isFinished: true,
        round: 8,
        date: "2024-09-05T09:10:27+00:00",
        playerlist: [
            {
                id: 1,
                name: "Hugh",
                score: 10,
                isActive: true,
                index: 0,
                rounds: [
                    {
                        "throw1": 10,
                        "throw2": 6,
                        "throw3": 14
                    },
                    {
                        "throw1": 20,
                        "throw2": 17,
                        "throw3": 0
                    },
                    {
                        "throw1": 25,
                        "throw2": 20,
                        "throw3": 20
                    },
                    {
                        "throw1": 50,
                        "throw2": 25,
                        "throw3": 0
                    },
                    {
                        "throw1": 25,
                        "throw2": 20,
                        "throw3": 25,

                    },
                    {
                        "throw1": 12,
                        "throw2": 5,
                        "throw3": undefined,
                        isRoundBust: true
                    },
                    {
                        "throw1": 3,
                        "throw2": 7,
                        "throw3": 4
                    },
                ],
            },
            {
                id: 2,
                name: "Norman",
                score: 0,
                isActive: false,
                index: 1,
                rounds: [
                    {
                        "throw1": 6,
                        "throw2": 16,
                        "throw3": 4
                    },
                    {
                        "throw1": 25,
                        "throw2": 16,
                        "throw3": 0
                    },
                    {
                        "throw1": 20,
                        "throw2": 20,
                        "throw3": 5
                    },
                    {
                        "throw1": 7,
                        "throw2": 20,
                        "throw3": 9
                    },
                    {
                        "throw1": 25,
                        "throw2": 20,
                        "throw3": 10
                    },
                    {
                        "throw1": 19,
                        "throw2": 12,
                        "throw3": 0
                    },
                    {
                        "throw1": 25,
                        "throw2": 17,
                        "throw3": 25
                    },
                ],
            }
        ]

    },

]