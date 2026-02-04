import { atom } from "nanostores";

// UI state for overlays
export const $isFinishGameOverlayOpen = atom<boolean>(false);
export const $isSettingsOverlayOpen = atom<boolean>(false);
export const $isNewPlayerOverlayOpen = atom<boolean>(false);

// Navigation
export const $activeTab = atom<string>("game");

// Error messages
export const $errorMessage = atom<string>("");

// Actions
/**
 * Opens the finish game overlay.
 */
export function openFinishGameOverlay(): void {
  $isFinishGameOverlayOpen.set(true);
}

/**
 * Closes the finish game overlay.
 */
export function closeFinishGameOverlay(): void {
  $isFinishGameOverlayOpen.set(false);
}

/**
 * Opens the settings overlay.
 */
export function openSettingsOverlay(): void {
  $isSettingsOverlayOpen.set(true);
}

/**
 * Closes the settings overlay.
 */
export function closeSettingsOverlay(): void {
  $isSettingsOverlayOpen.set(false);
}

/**
 * Opens the new player overlay.
 */
export function openNewPlayerOverlay(): void {
  $isNewPlayerOverlayOpen.set(true);
}

/**
 * Closes the new player overlay.
 */
export function closeNewPlayerOverlay(): void {
  $isNewPlayerOverlayOpen.set(false);
}

/**
 * Sets the active navigation tab.
 */
export function setActiveTab(tab: string): void {
  $activeTab.set(tab);
}

/**
 * Sets the current UI error message.
 */
export function setErrorMessage(message: string): void {
  $errorMessage.set(message);
}

/**
 * Clears the current UI error message.
 */
export function clearErrorMessage(): void {
  $errorMessage.set("");
}
