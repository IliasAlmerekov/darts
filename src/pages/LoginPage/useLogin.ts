import { useActionState } from "react";
import { ApiError } from "@/shared/api";
import { loginWithCredentials, getAuthenticatedUser } from "@/shared/api/auth";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { acceptLoggedInUser } from "@/shared/query/acceptLoggedInUser";
import { mapAuthErrorMessage } from "@/lib/error/auth-error-handling";

/** What the form shows after a submit: the mapped error and the typed values to keep. */
interface LoginFormState {
  error: string | null;
  email: string;
  password: string;
}

interface LoginReturn {
  /** The `<form action>` of the login form. */
  formAction: (formData: FormData) => void;
  loading: boolean;
  error: string | null;
  /** The last submitted values; the form feeds them back as `defaultValue`, because React 19 resets the fields after an action. */
  values: { email: string; password: string };
}

const INITIAL_STATE: LoginFormState = { error: null, email: "", password: "" };

// A user whose redirect points into the API came from the controller fallback; the
// target comes from `/api/login/success`.
const API_REDIRECT_PREFIX = "/api/";

function getAuthErrorRawMessage(error: unknown): string | undefined {
  return error instanceof ApiError && error.status === 401 ? "unauthorized" : undefined;
}

/** Reads the session user and accepts it; false when there is no session. */
async function acceptSessionUser(): Promise<boolean> {
  const authenticatedUser = await getAuthenticatedUser();
  if (authenticatedUser === null) {
    return false;
  }

  acceptLoggedInUser(authenticatedUser);
  return true;
}

/** Runs the login request; resolves to the error message to show, or null on success. */
async function attemptLogin(email: string, password: string): Promise<string | null> {
  try {
    const response = await loginWithCredentials({ email, password });

    if (response.type === "failure") {
      if (response.error === null && (await acceptSessionUser())) {
        return null;
      }

      return mapAuthErrorMessage({
        flow: "login",
        rawMessage: response.error,
      });
    }

    if (response.type === "session" || response.user.redirect.startsWith(API_REDIRECT_PREFIX)) {
      if (await acceptSessionUser()) {
        return null;
      }

      return mapAuthErrorMessage({ flow: "login", rawMessage: "unauthorized" });
    }

    acceptLoggedInUser(response.user);
    return null;
  } catch (error) {
    clientLogger.error("auth.login.failed", {
      error,
    });
    if (!(error instanceof ApiError && error.status === 401)) {
      try {
        if (await acceptSessionUser()) {
          return null;
        }
      } catch (sessionCheckError) {
        clientLogger.error("auth.login.session-check-after-error.failed", {
          error: sessionCheckError,
        });
      }
    }

    return mapAuthErrorMessage({
      flow: "login",
      error,
      rawMessage: getAuthErrorRawMessage(error),
    });
  }
}

async function submitLogin(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("_username") ?? "");
  const password = String(formData.get("_password") ?? "");

  return { error: await attemptLogin(email, password), email, password };
}

/**
 * Provides login flow state and the form action.
 * A successful login puts the user into the auth query, where the login page reads it the
 * same way as after a Remembered login check.
 */
export function useLogin(): LoginReturn {
  const [state, formAction, loading] = useActionState(submitLogin, INITIAL_STATE);

  return {
    formAction,
    loading,
    error: state.error,
    values: { email: state.email, password: state.password },
  };
}
