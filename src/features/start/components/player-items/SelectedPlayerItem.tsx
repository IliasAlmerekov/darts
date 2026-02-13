import moveIcon from "@/assets/icons/move.svg";
import deleteIcon from "@/assets/icons/delete.svg";
import styles from "./PlayerItems.module.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";

type Props = {
  name: string;
  isAdded?: boolean;
  user: BASIC.UserProps;
  handleClick: () => void;
  alt?: string;
  dragEnd?: boolean;
};

function SelectedPlayerItem({ ...props }: Props): React.JSX.Element {
  const { attributes, listeners, isDragging, setNodeRef, transform, transition } = useSortable({
    id: props.user.id,
    transition:
      props.dragEnd === false
        ? {
            duration: 300, // milliseconds
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          }
        : {
            duration: 0, // milliseconds
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
          },
  });

  const style = {
    opacity: isDragging ? 0.4 : undefined,
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.selectedPlayerItem}>
      <div className={styles.playerMain}>
        <button
          {...attributes}
          {...listeners}
          className={styles.moveButton}
          aria-label="Move player"
        >
          <img src={moveIcon} alt="Move icon" className={styles.moveIcon} />
        </button>
        <div className={styles.playerName}>{props?.name}</div>
      </div>
      <button
        onClick={props.handleClick}
        className={styles.deleteButton}
        aria-label="Delete player"
      >
        <img src={deleteIcon} alt={props.alt || "Delete"} />
      </button>
    </div>
  );
}
export default React.memo(SelectedPlayerItem);
