import clsx from "clsx";

export type Round = {
  throw1?: number;
  throw2?: number;
  throw3?: number;
};

export type PlayerProps = {
  id: number;
  name: string;
  score: number;
  isActive: boolean;
  index: number;
  rounds: Round[];
};

export default function Player({
  id,
  name,
  score,
  isActive,
  rounds,
}: PlayerProps) {
  function Boxes(props: any) {
    const currentRound = rounds.length - 1;
    if (rounds[currentRound] === undefined)
      return (
        <div className="boxesvertical">
          <div className="eachbox"></div>
          <div className="eachbox"></div>
          <div className="eachbox"></div>
        </div>
      );
    return (
      <div className="boxesvertical">
        <div className="eachbox">{rounds[currentRound].throw1}</div>
        <div className="eachbox">{rounds[currentRound].throw2}</div>
        <div className="eachbox">{rounds[currentRound].throw3}</div>
      </div>
    );
  }

  return (
    <li
      className={clsx("PlayerList", { ["activePlayer"]: isActive === true })}
      id={id.toString()}
    >
      {name} <div>{score}</div> {<Boxes throws={rounds} />}
    </li>
  );
}
