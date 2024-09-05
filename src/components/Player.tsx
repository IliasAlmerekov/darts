import clsx from "clsx";


export default function Player({
  id,
  name,
  score,
  isActive,
  rounds,
}: BASIC.PlayerProps) {
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
