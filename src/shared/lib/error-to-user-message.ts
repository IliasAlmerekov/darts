import { ApiError, NetworkError } from "@/lib/api";

const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again.";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ");
}

function mapTextToMessage(rawText: string): string | null {
  const text = normalizeText(rawText);

  if (
    text.includes("network request failed") ||
    text.includes("failed to fetch") ||
    text.includes("network error") ||
    text.includes("timeout")
  ) {
    return "Network error. Please check your connection and try again.";
  }

  if (
    text.includes("internal server error") ||
    text.includes("server error") ||
    text.includes("service unavailable") ||
    text.includes("bad gateway") ||
    text.includes("gateway timeout")
  ) {
    return "Server error. Please try again later.";
  }

  if (text.includes("unauthorized") || text.includes("forbidden")) {
    return "You are not authorized to perform this action.";
  }

  if (text.includes("not found")) {
    return "The requested resource was not found.";
  }

  return null;
}

function mapApiStatusToMessage(error: ApiError): string | null {
  if (error.status === 0) {
    return "Network error. Please check your connection and try again.";
  }

  if (error.status === 401 || error.status === 403) {
    return "You are not authorized to perform this action.";
  }

  if (error.status === 404) {
    return "The requested resource was not found.";
  }

  if (error.status >= 500) {
    return "Server error. Please try again later.";
  }

  return null;
}

function extractApiPayloadText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload as { error?: unknown; message?: unknown };
  if (typeof candidate.error === "string" && candidate.error.trim()) {
    return candidate.error.trim();
  }

  if (typeof candidate.message === "string" && candidate.message.trim()) {
    return candidate.message.trim();
  }

  return null;
}

export function toUserErrorMessage(error: unknown, fallback = DEFAULT_ERROR_MESSAGE): string {
  if (error instanceof NetworkError) {
    return "Network error. Please check your connection and try again.";
  }

  if (error instanceof ApiError) {
    const fromStatus = mapApiStatusToMessage(error);
    if (fromStatus) {
      return fromStatus;
    }

    const payloadText = extractApiPayloadText(error.data);
    if (payloadText) {
      return mapTextToMessage(payloadText) ?? payloadText;
    }

    return mapTextToMessage(error.message) ?? fallback;
  }

  if (error instanceof Error) {
    return mapTextToMessage(error.message) ?? fallback;
  }

  if (typeof error === "string" && error.trim()) {
    return mapTextToMessage(error) ?? error.trim();
  }

  return fallback;
}
