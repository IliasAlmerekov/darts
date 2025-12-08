import clsx from "clsx";
import styles from "./ViewToogleBtn.module.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function ViewToogleButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeView = location.pathname === "/gamesoverview" ? "games" : "players";
  return (
    <div>
      <div className={styles.viewToggle}>
        <button
          className={clsx(styles.viewButton, {
            [styles.activeBtn]: activeView === "players",
          })}
          onClick={() => {
            navigate("/statistics");
          }}
        >
          Players
        </button>
        <button
          className={clsx(styles.viewButton, {
            [styles.activeBtn]: activeView === "games",
          })}
          onClick={() => {
            navigate("/gamesoverview");
          }}
        >
          Games
        </button>
      </div>
    </div>
  );
}
