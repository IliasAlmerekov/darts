import clsx from "clsx";
import "./ViewToogleBtn.css";
import { useLocation, useNavigate } from "react-router-dom";

export default function ViewToogleButton() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeView = location.pathname === "/gamesoverview" ? "games" : "players";
  return (
    <div>
      <div className="view-toggle">
        <button
          className={clsx("view-button", {
            "active-btn": activeView === "players",
          })}
          onClick={() => {
            navigate("/statistics");
          }}
        >
          Players
        </button>
        <button
          className={clsx("view-button", {
            "active-btn": activeView === "games",
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
