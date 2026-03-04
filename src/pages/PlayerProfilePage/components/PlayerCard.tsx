import type { PlayerProfile } from "@/types/player";

interface PlayerCardProps {
  player: PlayerProfile;
}

export function PlayerCard({ player }: PlayerCardProps): React.JSX.Element {
  return (
    <div className="player-card">
      <div className="player-card__avatar">
        <span>{player.username?.[0]?.toUpperCase() ?? "?"}</span>
      </div>
      <div className="player-card__info">
        <div className="player-card__name">{player.username}</div>
        {player.gamesPlayed !== undefined && (
          <div className="player-card__meta">Games: {player.gamesPlayed}</div>
        )}
        {player.scoreAverage !== undefined && (
          <div className="player-card__meta">Avg: {player.scoreAverage}</div>
        )}
      </div>
    </div>
  );
}
