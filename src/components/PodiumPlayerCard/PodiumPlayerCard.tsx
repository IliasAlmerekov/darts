import './PodiumPlayerCard.css'

type Props = {
    name?: string
    placement?: number | string
    className?: string
    rounds?: number
    averagePerRound?: number
}

function PodiumPlayerCard({ ...props }: Props) {
    return (
        <div className={props.className}>
            <h4 className='centerAlign playerName'>{props.name}</h4>
            <div className='copylarge centerAlign color'>Rounds
                <h4 className='number'>{props.rounds}</h4>
            </div>
            <div className='copylarge centerAlign color'>Ø Round
                <h4 className='number'>{props.averagePerRound}</h4>
            </div>
            <div className='copylarge placementRound'>{props.placement}</div>
        </div>
    )
}
export default PodiumPlayerCard