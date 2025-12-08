import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useRoomInvitation } from "@/hooks/useRoomInvitation";
import { useGameState } from "@/hooks/useGameState";
import { useThrowHandler } from "@/features/game/hooks/useThrowHandler";
import { mapPlayersToUI, getFinishedPlayers } from "@/entities/player";
import { updateGameSettings } from "@/services/api";
import { closeFinishGameOverlay } from "@/stores/ui";

/**
 * Custom Hook für die gesamte Spiellogik.
 * Trennt Businesslogik von der UI-Komponente.
 */
export const useGameLogic = () => {
  const navigate = useNavigate();
  const { id: gameIdParam } = useParams<{ id?: string }>();
  const { invitation } = useRoomInvitation();

  // Ermittelt Spiel-ID aus URL oder Einladung
  const gameId = useMemo(() => {
    if (!gameIdParam) return invitation?.gameId ?? null;
    const parsed = Number(gameIdParam);
    return Number.isFinite(parsed) ? parsed : (invitation?.gameId ?? null);
  }, [gameIdParam, invitation?.gameId]);

  // Spiel-Daten und Handler
  const { gameData, isLoading, error, refetch, updateGameData } = useGameState({ gameId });
  const { handleThrow, handleUndo } = useThrowHandler({ gameId });

  // Lokaler State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [dismissedZeroScorePlayerIds, setDismissedZeroScorePlayerIds] = useState<number[]>([]);

  // Mappe Spieler für UI
  const playerUI = useMemo(() => mapPlayersToUI(gameData?.players ?? []), [gameData?.players]);

  // Filtere beendete und aktive Spieler
  const finishedPlayers = useMemo(() => getFinishedPlayers(playerUI), [playerUI]);
  const activePlayers = useMemo(() => playerUI.filter((p) => p.score > 0), [playerUI]);

  // Finde aktiven Spieler
  const activePlayer = useMemo(() => {
    if (!gameData) return null;
    return gameData.players.find((p) => p.id === gameData.activePlayerId) ?? null;
  }, [gameData]);

  // Sammle Spieler mit Score 0
  const zeroScorePlayerIds = useMemo(
    () => playerUI.filter((p) => p.score === 0).map((p) => p.id),
    [playerUI],
  );

  // Prüfe, ob Finish-Overlay angezeigt werden soll
  const shouldShowFinishOverlay = useMemo(() => {
    const hasZeroScore = zeroScorePlayerIds.length > 0;
    const hasUndismissed = zeroScorePlayerIds.some(
      (id) => !dismissedZeroScorePlayerIds.includes(id),
    );
    return hasZeroScore && hasUndismissed && gameData?.status !== "finished";
  }, [zeroScorePlayerIds, dismissedZeroScorePlayerIds, gameData?.status]);

  // Prüfe Interaktions-Status
  const isInteractionDisabled = isLoading || !!error || !gameData || shouldShowFinishOverlay;

  // Bereinige bestätigte IDs
  useEffect(() => {
    setDismissedZeroScorePlayerIds((prev) => prev.filter((id) => zeroScorePlayerIds.includes(id)));
  }, [zeroScorePlayerIds]);

  // Navigation bei Spielende
  useEffect(() => {
    // Only navigate if:
    // 1. Game data exists and IDs match (not stale data from previous game)
    // 2. Game status is finished
    // 3. Has a winner
    // 4. Current round > 1 (not initial state)
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

  // Reset bei neuer Spiel-ID
  useEffect(() => {
    setDismissedZeroScorePlayerIds([]);
  }, [gameId]);

  // Event Handler
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
      const newSettings = await updateGameSettings(gameId, settings);
      updateGameData({ ...gameData, settings: newSettings });
      setIsSettingsOpen(false);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : "Failed to update settings");
    } finally {
      setIsSavingSettings(false);
    }
  };

  return {
    // Daten
    gameId,
    gameData,
    isLoading,
    error,
    activePlayers,
    finishedPlayers,
    activePlayer,
    shouldShowFinishOverlay,
    isInteractionDisabled,

    // Settings State
    isSettingsOpen,
    isSavingSettings,
    settingsError,

    // Handler
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
