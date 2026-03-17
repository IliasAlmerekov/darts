import moveIcon from "@/assets/icons/move.svg";
import deleteIcon from "@/assets/icons/delete.svg";
import styles from "./PlayerItems.module.css";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React from "react";
import type { UserProps } from "@/types";

interface Props {
  name: string;
  user: UserProps;
  handleClick: () => void;
  alt?: string;
  dragEnd?: boolean | undefined;
}

function SelectedPlayerItem({ ...props }: Props): React.JSX.Element {
  const {
    attributes,
    listeners,
    isDragging,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
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
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.selectedPlayerItem}>
      <div className={styles.playerMain}>
        <button
          ref={setActivatorNodeRef}
          type="button"
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
