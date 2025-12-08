import styles from "./GamePage.module.css";
import { NavigationBar } from "@/widgets/navigation";
import { GameBoard } from "@/widgets/game-board";
import { useGamePage } from "../model/useGamePage";

export function GamePage() {
  const { gameId } = useGamePage();

  if (!gameId) {
    return <div>Invalid game id</div>;
  }

  return (
    <div className={styles.page}>
      <NavigationBar />
      <div className={styles.content}>
        <GameBoard gameId={gameId} />
      </div>
    </div>
  );
}
