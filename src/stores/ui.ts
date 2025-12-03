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
export function openFinishGameOverlay(): void {
  $isFinishGameOverlayOpen.set(true);
}

export function closeFinishGameOverlay(): void {
  $isFinishGameOverlayOpen.set(false);
}

export function openSettingsOverlay(): void {
  $isSettingsOverlayOpen.set(true);
}

export function closeSettingsOverlay(): void {
  $isSettingsOverlayOpen.set(false);
}

export function openNewPlayerOverlay(): void {
  $isNewPlayerOverlayOpen.set(true);
}

export function closeNewPlayerOverlay(): void {
  $isNewPlayerOverlayOpen.set(false);
}

export function setActiveTab(tab: string): void {
  $activeTab.set(tab);
}

export function setErrorMessage(message: string): void {
  $errorMessage.set(message);
}

export function clearErrorMessage(): void {
  $errorMessage.set("");
}
