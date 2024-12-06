import moveIcon from '../../icons/move.svg'
import deleteIcon from '../../icons/delete.svg'
import './PlayerItems.css'
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Props = {
    name: string;
    key: number;
    isAdded?: boolean;
    user: any
    handleClick: () => void;
    alt?: string;
    dragEnd?: boolean;
}

function SelectedPlayerItem({ ...props }: Props) {
    const {
        attributes,
        listeners,
        isDragging,
        setNodeRef,
        transform,
        transition
    } = useSortable({
        id: props.user.id,
        transition: props.dragEnd === false ? {
            duration: 300, // milliseconds
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        } : {
            duration: 0, // milliseconds
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        },
    });

    const style = {
        opacity: isDragging ? 0.4 : undefined,
        transform: CSS.Translate.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="selectedPlayerItem"
            key={props?.key}
        >
            <div>
                <button
                    {...attributes}
                    {...listeners}
                >
                    <img src={moveIcon} alt="Move icon" />
                </button>
                <div className='copylarge'>{props?.name}</div>
            </div>
            <img src={deleteIcon} alt={props.alt} onClick={props.handleClick} />
        </div>
    )

}
export default SelectedPlayerItem