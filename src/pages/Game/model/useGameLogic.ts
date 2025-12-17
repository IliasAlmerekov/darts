import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useRoomInvitation } from "@/hooks/useRoomInvitation";
import { useGameState } from "@/hooks/useGameState";
import { useThrowHandler } from "@/features/game/hooks/useThrowHandler";
import { mapPlayersToUI, getFinishedPlayers } from "@/entities/player";
import { updateGameSettings } from "@/services/api";
import { closeFinishGameOverlay } from "@/stores/ui";

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

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [dismissedZeroScorePlayerIds, setDismissedZeroScorePlayerIds] = useState<number[]>([]);

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

  const handleSaveSettings = async (settings: {
    startScore: number;
    doubleOut: boolean;
    tripleOut: boolean;
  }) => {
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
    isSettingsOpen,
    isSavingSettings,
    settingsError,
    handleThrow,
    handleUndo,
    handleContinueGame,
    handleUndoFromOverlay,
    handleOpenSettings,
    handleCloseSettings,
    handleSaveSettings,
    refetch,
  };
};
