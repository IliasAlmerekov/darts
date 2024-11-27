import './index.css'

type Props = {
    className?: string
    rounds?: number
    averagePerRound?: number
    name?: string
    placement?: number
}


function OverviewPlayerItem({ ...props }: Props) {
    return (
        <div className={props.className}>
            <div className='playerInfos'>
                <h4 className="leaderboard">{props.placement}</h4>
                <div className='copylarge '>{props.name}</div>
            </div>
            <div className='playerStatistics'>
                <div className='copylarge rounds'>Rounds <h4 className='numberDisplay'>{props.rounds}</h4></div>
                <div className='copylarge rounds'>Ø Round <h4 className='numberDisplay'>{props.averagePerRound}</h4></div>
            </div>
        </div>
    )
}
export default OverviewPlayerItem;