import clsx from "clsx";
import styles from "./PlayerItems.module.css";

type Props = {
  name: string;
  isAdded?: boolean;
  handleClickOrDelete: () => void;
  src: string;
  alt?: string;
  isClicked?: number | null;
};

function UnselectedPlayerItem({ ...props }: Props) {
  return (
    <div
      className={clsx(styles.unselectedPlayerItem, {
        [styles.fadeOut]: !!props.isClicked,
      })}
    >
      <div className="copylarge">{props?.name}</div>
      <button
        onClick={props.handleClickOrDelete}
        className={styles.moveButton}
        aria-label="Move Button"
      >
        <img src={props.src} alt={props.alt} />
      </button>
    </div>
  );
}
export default UnselectedPlayerItem;
