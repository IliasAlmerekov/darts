// API
export * from "./api";

// Ports
export type { GameFlowPort, AddGuestErrorResponse } from "./ports/game-flow";

// Providers
export { GameFlowPortProvider, useGameFlowPort } from "./providers/GameFlowPortProvider";

// Routes
export { default as Game } from "./routes/Game";

// Store
export {
  $gameData,
  $isLoading,
  $error,
  $activePlayer,
  $currentRound,
  $currentThrowCount,
  $isGameFinished,
  $winnerId,
  $gameSettings,
  $playersForUI,
  setGameData,
  setLoading,
  setError,
  resetGameStore,
} from "./store";

// UI Store
export {
  $isFinishGameOverlayOpen,
  $isSettingsOverlayOpen,
  $isNewPlayerOverlayOpen,
  $activeTab,
  $errorMessage,
  openFinishGameOverlay,
  closeFinishGameOverlay,
  openSettingsOverlay,
  closeSettingsOverlay,
  openNewPlayerOverlay,
  closeNewPlayerOverlay,
  setActiveTab,
  setErrorMessage,
  clearErrorMessage,
} from "./ui-store";
