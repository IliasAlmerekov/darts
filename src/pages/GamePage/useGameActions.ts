import { useCallback, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate } from "react-router-dom";
import { abortGame, createRematch, updateGameSettings } from "@/shared/api/game";
import { mergeGameSettings } from "@/lib/mergeGameSettings";
import { toUserErrorMessage } from "@/lib/error-to-user-message";
import { ROUTES } from "@/lib/routes";
import { resetRoomStore, setInvitation } from "@/store";
import type { GameThrowsResponse } from "@/types";

interface GameSettingsFormValues {
  doubleOut: boolean;
  tripleOut: boolean;
}

interface UseGameSettingsFlowOptions {
  gameData: GameThrowsResponse | null;
  gameId: number | null;
  updateGameData: (data: GameThrowsResponse) => void;
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
  setPageError: Dispatch<SetStateAction<string | null>>;
}

interface UseGameExitFlowResult {
  handleCloseExitOverlay: () => void;
  handleExitGame: () => Promise<void>;
  handleOpenExitOverlay: () => void;
  isExitOverlayOpen: boolean;
}

export function useGameSettingsFlow({
  gameData,
  gameId,
  updateGameData,
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
    async (settings: GameSettingsFormValues) => {
      if (!gameData || !gameId) {
        return;
      }

      setSettingsError(null);
      setIsSavingSettings(true);

      try {
        const updatedSettings = await updateGameSettings(gameId, settings);
        const updatedGame = mergeGameSettings(gameData, updatedSettings, gameId);

        if (!updatedGame) {
          throw new Error("Cannot merge updated settings without current game state");
        }

        updateGameData(updatedGame);
        setIsSettingsOpen(false);
      } catch (error) {
        setSettingsError(toUserErrorMessage(error, "Failed to update settings"));
      } finally {
        setIsSavingSettings(false);
      }
    },
    [gameData, gameId, updateGameData],
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

  const handleOpenExitOverlay = useCallback(() => {
    setIsExitOverlayOpen(true);
  }, []);

  const handleCloseExitOverlay = useCallback(() => {
    setIsExitOverlayOpen(false);
  }, []);

  const handleExitGame = useCallback(async () => {
    if (!gameId) {
      return;
    }

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
      console.error("Failed to exit game:", error);
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
