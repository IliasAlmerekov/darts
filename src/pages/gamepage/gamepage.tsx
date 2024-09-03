import { useState, useEffect } from "react";
import "./gamepage.css";
import { UserProps } from "../home";
import Player from "../../components/Player";
import { PlayerProps } from "../../components/Player";

/* export type GameProps = {
    player: PlayerProps
} */

type UserList = {
  userList?: UserProps[];
};

const mockUserList = [
  {
    id: 1,
    name: "name 1",
  },
  {
    id: 2,
    name: "name 2",
  },
];

function GamePage({ userList }: UserList) {
  const [playerScore, setPlayerScore] = useState(15); // change after testing to 301
  const [roundsCount, setRoundsCount] = useState(1); //Rundenanzeige
  const [playerList, setPlayerList] = useState<PlayerProps[]>([]);
  const [throwCount, setThrowCount] = useState(0); // zählt wie oft geworfen wurde
  const [playerTurn, setPlayerTurn] = useState(0); // index of player
  const keyboardNumbers: { rows: number[][] } = {
    rows: [
      [1, 2, 3, 4, 5, 6, 7, 8],
      [9, 10, 11, 12, 13, 14, 15, 16],
      [17, 18, 19, 20, 25, 50, 0, 0],
    ],
  };

  function initializePlayerList() {
    // GOOD
    const initialPlayerlist: PlayerProps[] = [];
    mockUserList.forEach((user: UserProps, i) => {
      const player = {
        id: user.id,
        name: user.name,
        score: playerScore,
        isActive: i === 0 ? true : false, // initial active player with first index for styling
        index: i,
        rounds: [{ throw1: undefined, throw2: undefined, throw3: undefined }],
        //displayThrows: [], -> DELETE?
      };
      initialPlayerlist.push(player);
    });

    setPlayerList(initialPlayerlist);
  }

  function changeActivePlayer() {
    // GOOD
    const prevPlayerTurnIndex = playerTurn;
    const newPlayerTurnIndex = playerTurn + 1;
    const newPlayerList: PlayerProps[] = [...playerList];

    newPlayerList[prevPlayerTurnIndex].isActive = false;
    const isEndOfArray = newPlayerTurnIndex > newPlayerList.length - 1;
    const handleNewIndex = isEndOfArray ? 0 : newPlayerTurnIndex;
    newPlayerList[handleNewIndex].isActive = true;
    newPlayerList[handleNewIndex].rounds = [
      { throw1: undefined, throw2: undefined, throw3: undefined },
    ];
    setPlayerList(newPlayerList);
    setPlayerTurn(handleNewIndex);
    setThrowCount(0);

    if (isEndOfArray) {
      setRoundsCount(roundsCount + 1);
    }
  }

  function handleThrow(
    currentRound: number,
    player: PlayerProps,
    currentThrow: number,
    currentScoreAchieved: number
  ) {
    // GOOD - handle undefined currentPlayerThrows later..
    // GOOD - if the newScore is -1, the player has busted.. fix this later

    const newScore = playerList[playerTurn].score - currentScoreAchieved;

    const currentPlayerThrows = player.rounds[currentRound - 1];
    if (!currentPlayerThrows) {
      // handle this later..
    }
    switch (currentThrow) {
      // update the current throw currentScoreAchieved in the round
      case 0: // first throw
        currentPlayerThrows.throw1 = currentScoreAchieved as unknown as number;
        break;
      case 1: // second throw
        currentPlayerThrows.throw2 = currentScoreAchieved as unknown as number;
        break;
      case 2: // third throw
        currentPlayerThrows.throw3 = currentScoreAchieved as unknown as number;
        break;
      default:
    }
    setPlayerScore(newScore);

    if (newScore < 0) {
      // if the newScore is -1, the player has busted.. fix this later
    }
    if (currentScoreAchieved > playerList[playerTurn].score) {
      bust(playerScore);
    } else {
      playerList[playerTurn].score = newScore;
      setThrowCount(currentThrow + 1);
    }

    if (playerList[playerTurn].score === 0) {
      window.location.replace("/winner");
      alert("winner winner chicken dinner");
    }

    const updatedPlayerlist = [...playerList];
    updatedPlayerlist[playerTurn] = player;
    setPlayerList(updatedPlayerlist);
  }

  function bust(bustedPlayerScore: number) {
    const currentRoundOfPlayer = playerList[playerTurn].rounds[roundsCount - 1];
    const firstThrow = currentRoundOfPlayer.throw1;
    const secondThrow = currentRoundOfPlayer.throw2;
    const thirdThrow = currentRoundOfPlayer.throw3;
    let oldThrowScore = playerScore;

    if (thirdThrow) {
      console.log("busted! on third throw!");
      let firstAndSecondThrowScore = 0;
      if (firstThrow && secondThrow) {
        firstAndSecondThrowScore = firstThrow + secondThrow;
      }
      oldThrowScore = firstAndSecondThrowScore + bustedPlayerScore;
      console.log(
        "busted third throw result",
        firstAndSecondThrowScore + bustedPlayerScore
      );
    } else if (
      firstThrow &&
      secondThrow &&
      secondThrow > playerList[playerTurn].score
    ) {
      // bust on second throw
      console.log("bust on second throw");
      console.log("ergebnis2", firstThrow + bustedPlayerScore);
      oldThrowScore = firstThrow + bustedPlayerScore; //updated manchmal\\
    }

    playerList[playerTurn].score = oldThrowScore;
    changeActivePlayer();
  }

  function NumberButton(props: any) {
    return (
      <button
        className="btn"
        onClick={() =>
          handleThrow(
            roundsCount,
            playerList[playerTurn],
            throwCount,
            props.value
          )
        }
      >
        {props.value}
      </button>
    );
  }

  useEffect(() => {
    initializePlayerList(); // runs once on mount
  }, []);

  useEffect(() => {
    if (throwCount === 3) {
      changeActivePlayer();
    }
  }, [throwCount]);

  return (
    <>
      <div className="Gamepage">
        <div className="Roundcounter">Round: {roundsCount}</div>
        <div className="box">
          {" "}
          {playerList.map((item: PlayerProps) => {
            return <Player {...item} />;
          })}
        </div>
      </div>

      <div className="Numberstyle">
        {keyboardNumbers.rows.map((row) => (
          <div className="row">
            {row.map((number) => (
              <NumberButton value={number} />
            ))}
            :
          </div>
        ))}
        <div className="row">
          <button className="specialButton">Double</button>
          <button className="specialButton">Triple</button>
        </div>
      </div>
      <div>
        <button onClick={changeActivePlayer}>{throwCount}</button>
      </div>
    </>
  );
}
export default GamePage;
