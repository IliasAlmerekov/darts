import type { InvitationError } from "@/shared/api/auth";

const INVITATION_ERROR_MESSAGES: Record<InvitationError, string> = {
  GAME_ALREADY_STARTED: "This game has already started",
  GAME_ROOM_FULL: "This game is full",
  GAME_NOT_FOUND: "This game no longer exists",
  GAME_JOIN_NOT_ALLOWED: "This game can no longer be joined",
};

/**
 * Returns the text for an invitation the backend could not join after a successful login.
 */
export function mapInvitationErrorMessage(invitationError: InvitationError): string {
  return INVITATION_ERROR_MESSAGES[invitationError];
}
