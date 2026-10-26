import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { abortGame, createRematch, getGameThrows, updateGameSettings } from "@/shared/api/game";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { toUserErrorMessage } from "@/lib/error/error-to-user-message";
import { ROUTES } from "@/lib/router/routes";
import { resetRoomStore, setInvitation } from "@/shared/store";
import { isGameAbortNotAllowedError } from "./lib/gameAbortNotAllowed";
import type { GameSettings, GameThrowsResponse } from "@/types";

interface GameSettingsFormValues {
  doubleOut: boolean;
  tripleOut: boolean;
}

interface UseGameSettingsFlowOptions {
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  updateGameSettings: (settings: GameSettings) => void;
}

interface UseGameSettingsFlowResult {
  handleCloseSettings: () => void;
  handleOpenSettings: () => void;
  handleSaveSettings: (settings: GameSettingsFormValues) => Promise<void>;
  isSavingSettings: boolean;
  isSettingsOpen: boolean;
  settingsError: string | null;
}

interface UseGameExitFlowOptions {
  gameId: number | null;
  navigate: ReturnType<typeof useNavigate>;
  setPageError: (error: string | null) => void;
}

interface UseGameExitFlowResult {
  handleCloseExitOverlay: () => void;
  handleExitGame: () => Promise<void>;
  handleOpenExitOverlay: () => void;
  isExitOverlayOpen: boolean;
}

// The 409 code is the same for a lobby and a finished game, and the page state can be stale.
async function isGameFinished(gameId: number, signal: AbortSignal): Promise<boolean> {
  try {
    return (await getGameThrows(gameId, signal)).status === "finished";
  } catch (error) {
    if (signal.aborted) {
      return false;
    }
    // The caller still reports the abort error; this read only decides the route.
    clientLogger.warn("game.exit.status_check_failed", { context: { gameId }, error });
    return false;
  }
}

export function useGameSettingsFlow({
  gameData,
  gameId,
  updateGameSettings: syncGameSettings,
}: UseGameSettingsFlowOptions): UseGameSettingsFlowResult {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const handleOpenSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleCloseSettings = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleSaveSettings = useCallback(
    async (settings: GameSettingsFormValues): Promise<void> => {
      if (!gameData || gameId === null) {
        return;
      }

      setSettingsError(null);
      setIsSavingSettings(true);

      try {
        const updatedSettings = await updateGameSettings(gameId, settings);
        syncGameSettings(updatedSettings);
        setIsSettingsOpen(false);
      } catch (error) {
        setSettingsError(toUserErrorMessage(error, "Failed to update settings"));
      } finally {
        setIsSavingSettings(false);
      }
    },
    [gameData, gameId, syncGameSettings],
  );

  return {
    handleCloseSettings,
    handleOpenSettings,
    handleSaveSettings,
    isSavingSettings,
    isSettingsOpen,
    settingsError,
  };
}

export function useGameExitFlow({
  gameId,
  navigate,
  setPageError,
}: UseGameExitFlowOptions): UseGameExitFlowResult {
  const [isExitOverlayOpen, setIsExitOverlayOpen] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  // A late answer for a game the page left must not navigate or set an error.
  useEffect(() => {
    return () => {
      controllerRef.current?.abort();
    };
  }, [gameId]);

  const handleOpenExitOverlay = useCallback(() => {
    setIsExitOverlayOpen(true);
  }, []);

  const handleCloseExitOverlay = useCallback(() => {
    setIsExitOverlayOpen(false);
  }, []);

  const handleExitGame = useCallback(async (): Promise<void> => {
    if (gameId === null) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setPageError(null);
      await abortGame(gameId);
      resetRoomStore();

      const rematch = await createRematch(gameId);
      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate(ROUTES.start(rematch.gameId));
    } catch (error) {
      const isFinished =
        isGameAbortNotAllowedError(error) && (await isGameFinished(gameId, controller.signal));
      if (controller.signal.aborted) {
        return;
      }

      if (isFinished) {
        // The last throw finished the game while the overlay was open.
        navigate(ROUTES.summary(gameId), { state: { finishedGameId: gameId } });
        return;
      }

      clientLogger.error("game.exit.failed", {
        context: { gameId },
        error,
      });
      setPageError(toUserErrorMessage(error, "Could not leave the game. Please try again."));
    }
  }, [gameId, navigate, setPageError]);

  return {
    handleCloseExitOverlay,
    handleExitGame,
    handleOpenExitOverlay,
    isExitOverlayOpen,
  };
}
