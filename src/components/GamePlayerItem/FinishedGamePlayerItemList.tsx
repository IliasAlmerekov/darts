import "../GamePlayerItem/GamePlayerItem.css";

type Props = {
  userMap?: { name: string }[];
};

function FinishedGamePlayerItemList({ userMap }: Props) {
  const FinishedGamePlayerItem = ({
    name,
    place,
  }: {
    name?: string;
    place?: string;
  }) => (
    <div className="gamePlayerItem finished">
      <div>
        <div className="copylarge">{name}</div>
      </div>
      <div className="place">{place}</div>
    </div>
  );

  if (!userMap || userMap.length === 0) {
    return <></>;
  }

  return (
    <div className="finishedPlayerList">
      <div className="copylarge finishedplayers">Finished Players</div>
      {userMap.map((item, index) => (
        <FinishedGamePlayerItem
          key={index}
          name={item.name}
          place={`${index + 1}.`}
        />
      ))}
    </div>
  );
}

export default FinishedGamePlayerItemList;
