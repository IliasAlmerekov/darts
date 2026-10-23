import { useEffect } from "react";
import { ROUTES } from "@/lib/router/routes";
import { unlockSounds } from "@/shared/services/browser/soundPlayer";

interface UseGameSummaryNavigationOptions {
  gameId: number | null;
  /** From the game session: the game is finished and every tap is acknowledged. */
  isFinished: boolean;
  navigate: (to: string, options?: { state?: { finishedGameId: number } }) => void;
}

export function useInteractionSoundUnlock(): void {
  useEffect(() => {
    const handleInteraction = () => {
      unlockSounds();
    };

    window.addEventListener("pointerdown", handleInteraction, { once: true, passive: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, []);
}

export function useGameSummaryNavigation({
  gameId,
  isFinished,
  navigate,
}: UseGameSummaryNavigationOptions): void {
  useEffect(() => {
    if (isFinished && gameId !== null) {
      navigate(ROUTES.summary(gameId), { state: { finishedGameId: gameId } });
    }
  }, [gameId, isFinished, navigate]);
}
