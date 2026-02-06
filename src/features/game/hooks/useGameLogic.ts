import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useRoomInvitation, useRoomStream } from "@/features/room";
import { mapPlayersToUI, getFinishedPlayers } from "@/features/player";
import { useGameState } from "./useGameState";
import { useThrowHandler } from "./useThrowHandler";
import { useGameSounds } from "./useGameSounds";
import { updateGameSettings, createRematch, abortGame } from "../api";
import type { GameThrowsResponse } from "../api";
import { closeFinishGameOverlay } from "@/stores/ui";
import { setInvitation, resetRoomStore } from "@/stores";
import { unlockSounds } from "@/lib/soundPlayer";

/**
 * Aggregates game state, side effects, and UI handlers for the game page.
 */
export function areAllPlayersAtStartScore(gameData: GameThrowsResponse | null): boolean {
  if (!gameData) return true;
  return gameData.players.every((player) => player.score === gameData.settings.startScore);
}

export const useGameLogic = () => {
  const navigate = useNavigate();
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const { invitation } = useRoomInvitation();

  const gameId = useMemo(() => {
    if (!gameIdParam) return invitation?.gameId ?? null;
    const parsed = Number(gameIdParam);
    return Number.isFinite(parsed) ? parsed : (invitation?.gameId ?? null);
  }, [gameIdParam, invitation?.gameId]);

  const { gameData, isLoading, error, refetch, updateGameData } = useGameState({ gameId });
  const { handleThrow, handleUndo } = useThrowHandler({ gameId });
  const { event } = useRoomStream(gameId);

  useGameSounds(gameData);

  useEffect(() => {
    const handler = () => {
      unlockSounds();
    };

    window.addEventListener("pointerdown", handler, { once: true, passive: true });
    window.addEventListener("keydown", handler, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handler);
      window.removeEventListener("keydown", handler);
    };
  }, []);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [dismissedZeroScorePlayerIds, setDismissedZeroScorePlayerIds] = useState<number[]>([]);
  const [isExitOverlayOpen, setIsExitOverlayOpen] = useState(false);

  const playerUI = useMemo(() => mapPlayersToUI(gameData?.players ?? []), [gameData?.players]);
  const finishedPlayers = useMemo(() => getFinishedPlayers(playerUI), [playerUI]);
  const activePlayers = useMemo(() => playerUI.filter((p) => p.score > 0), [playerUI]);

  const activePlayer = useMemo(() => {
    if (!gameData) return null;
    return gameData.players.find((p) => p.id === gameData.activePlayerId) ?? null;
  }, [gameData]);

  const zeroScorePlayerIds = useMemo(
    () => playerUI.filter((p) => p.score === 0).map((p) => p.id),
    [playerUI],
  );

  const shouldShowFinishOverlay = useMemo(() => {
    const hasZeroScore = zeroScorePlayerIds.length > 0;
    const hasUndismissed = zeroScorePlayerIds.some(
      (id) => !dismissedZeroScorePlayerIds.includes(id),
    );
    return hasZeroScore && hasUndismissed && gameData?.status !== "finished";
  }, [zeroScorePlayerIds, dismissedZeroScorePlayerIds, gameData?.status]);

  const isInteractionDisabled = isLoading || !!error || !gameData || shouldShowFinishOverlay;
  const isUndoDisabled = isInteractionDisabled || areAllPlayersAtStartScore(gameData);

  useEffect(() => {
    setDismissedZeroScorePlayerIds((prev) => prev.filter((id) => zeroScorePlayerIds.includes(id)));
  }, [zeroScorePlayerIds]);

  useEffect(() => {
    if (
      gameData &&
      gameData.id === gameId &&
      gameData.status === "finished" &&
      gameData.winnerId &&
      gameData.currentRound > 1
    ) {
      navigate(`/summary/${gameId}`, { state: { finishedGameId: gameId } });
    }
  }, [gameData, gameId, navigate]);

  useEffect(() => {
    if (!event) return;
    if (
      event.type === "throw-recorded" ||
      event.type === "game-started" ||
      event.type === "game-finished"
    ) {
      void refetch();
    }
  }, [event, refetch]);

  useEffect(() => {
    setDismissedZeroScorePlayerIds([]);
  }, [gameId]);

  const handleContinueGame = () => {
    closeFinishGameOverlay();
    setDismissedZeroScorePlayerIds((prev) => Array.from(new Set([...prev, ...zeroScorePlayerIds])));
  };

  const handleUndoFromOverlay = async () => {
    await handleUndo();
    closeFinishGameOverlay();
  };

  const handleOpenSettings = () => setIsSettingsOpen(true);
  const handleCloseSettings = () => setIsSettingsOpen(false);

  const handleSaveSettings = async (settings: { doubleOut: boolean; tripleOut: boolean }) => {
    if (!gameData || !gameId) return;

    setSettingsError(null);
    setIsSavingSettings(true);

    try {
      const updatedGame = await updateGameSettings(gameId, settings);
      updateGameData(updatedGame);
      setIsSettingsOpen(false);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleOpenExitOverlay = () => setIsExitOverlayOpen(true);
  const handleCloseExitOverlay = () => setIsExitOverlayOpen(false);

  const handleExitGame = async () => {
    if (!gameId) return;

    try {
      await abortGame(gameId);
      resetRoomStore();
      const rematch = await createRematch(gameId);

      setInvitation({
        gameId: rematch.gameId,
        invitationLink: rematch.invitationLink,
      });

      navigate(`/start/${rematch.gameId}`);
    } catch (err) {
      console.error("Failed to exit game:", err);
      navigate("/start");
    }
  };

  return {
    gameId,
    gameData,
    isLoading,
    error,
    activePlayers,
    finishedPlayers,
    activePlayer,
    shouldShowFinishOverlay,
    isInteractionDisabled,
    isUndoDisabled,
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    isExitOverlayOpen,
    handleThrow,
    handleUndo,
    handleContinueGame,
    handleUndoFromOverlay,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    handleOpenExitOverlay,
    handleCloseExitOverlay,
    handleExitGame,
    refetch,
  };
};
