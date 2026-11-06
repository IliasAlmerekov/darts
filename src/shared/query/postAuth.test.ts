// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  acceptAuthenticatedUser,
  dismissInvitationError,
  resolveAuthDestination,
} from "./postAuth";
import { authQueries } from "./auth.queries";
import { queryClient } from "./queryClient";
import {
  loginWithCredentials,
  registerUser,
  type AuthenticatedUser,
  type InvitationError,
} from "@/shared/api/auth";
import { apiClient } from "@/shared/api/client";
import { respondWith } from "@/shared/api/test-utils";
import { ROUTES } from "@/lib/router/routes";
import { clientLogger } from "@/shared/services/browser/clientLogger";
import { $currentGameId, setCurrentGameId } from "@/shared/store";

const AUTH_KEY = authQueries.me().queryKey;
const ORIGIN = window.location.origin;

/** The user in the auth cache; the test fails when the cache is empty. */
function readCachedUser(): AuthenticatedUser {
  const user = queryClient.getQueryData(AUTH_KEY);
  if (!user) {
    throw new Error("The auth cache holds no user.");
  }
  return user;
}

/** One answer of the backend, the context the page passes, and what must come out. */
interface PostAuthCase {
  name: string;
  role: "ROLE_PLAYER" | "ROLE_ADMIN";
  redirect: string;
  gameId?: number;
  invitationError?: InvitationError;
  from: string;
  storedGameId: number | null;
  /** Where the user goes; after an invitation error, once they dismiss it. */
  destination: string;
  currentGameId: number | null;
}

const JOINED_PLAYER: PostAuthCase = {
  name: "a player who joined a game goes to the Waiting room and stores the game",
  role: "ROLE_PLAYER",
  redirect: `${ORIGIN}/joined`,
  gameId: 42,
  from: ROUTES.start(),
  storedGameId: null,
  destination: ROUTES.joined,
  currentGameId: 42,
};

const REJECTED_PLAYER: PostAuthCase = {
  name: "a player whose invitation failed opens the Player profile once it is dismissed and drops a stale stored game",
  role: "ROLE_PLAYER",
  redirect: `${ORIGIN}/playerprofile`,
  invitationError: "GAME_ROOM_FULL",
  from: ROUTES.start(),
  storedGameId: 7,
  destination: ROUTES.playerProfile,
  currentGameId: null,
};

const CASES: PostAuthCase[] = [
  JOINED_PLAYER,
  {
    name: "a player who joined a game replaces a stale stored game",
    role: "ROLE_PLAYER",
    redirect: `${ORIGIN}/joined`,
    gameId: 42,
    from: ROUTES.start(),
    storedGameId: 7,
    destination: ROUTES.joined,
    currentGameId: 42,
  },
  {
    name: "a player who joined a game ignores the protected source route",
    role: "ROLE_PLAYER",
    redirect: `${ORIGIN}/joined`,
    gameId: 42,
    from: "/statistics",
    storedGameId: null,
    destination: ROUTES.joined,
    currentGameId: 42,
  },
  {
    name: "a player without a game goes to the Player profile and drops a stale stored game",
    role: "ROLE_PLAYER",
    redirect: `${ORIGIN}/playerprofile`,
    from: ROUTES.start(),
    storedGameId: 7,
    destination: ROUTES.playerProfile,
    currentGameId: null,
  },
  REJECTED_PLAYER,
  {
    name: "a player whose invitation failed opens the Player profile once it is dismissed, not the source route",
    role: "ROLE_PLAYER",
    redirect: `${ORIGIN}/playerprofile`,
    invitationError: "GAME_NOT_FOUND",
    from: "/statistics",
    storedGameId: null,
    destination: ROUTES.playerProfile,
    currentGameId: null,
  },
  {
    name: "an admin goes to the start page",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/start`,
    from: ROUTES.start(),
    storedGameId: null,
    destination: ROUTES.start(),
    currentGameId: null,
  },
  {
    name: "an admin with a stored game goes to the start page and keeps the stored game",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/start`,
    from: ROUTES.start(),
    storedGameId: 99,
    destination: ROUTES.start(),
    currentGameId: 99,
  },
  {
    name: "an admin with a stored game goes to the protected source route",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/start`,
    from: "/statistics",
    storedGameId: 99,
    destination: "/statistics",
    currentGameId: 99,
  },
  {
    name: "an admin with a game-specific start redirect goes to the source route",
    role: "ROLE_ADMIN",
    redirect: "/start/42",
    from: "/statistics",
    storedGameId: null,
    destination: "/statistics",
    currentGameId: null,
  },
  {
    name: "an admin whose redirect leaves the app goes to the source route",
    role: "ROLE_ADMIN",
    redirect: "https://evil.example/phishing",
    from: "/statistics",
    storedGameId: null,
    destination: "/statistics",
    currentGameId: null,
  },
  {
    name: "an admin whose source route leaves the app goes to the start page",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/start`,
    from: "https://evil.example/phishing",
    storedGameId: null,
    destination: ROUTES.start(),
    currentGameId: null,
  },
  {
    name: "an admin whose source route is protocol-relative goes to the start page",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/start`,
    from: "//evil.example",
    storedGameId: null,
    destination: ROUTES.start(),
    currentGameId: null,
  },
  {
    name: "an invited admin goes to the Waiting room and keeps the stored game",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/joined`,
    gameId: 42,
    from: ROUTES.start(),
    storedGameId: 7,
    destination: ROUTES.joined,
    currentGameId: 7,
  },
  {
    name: "an admin whose invitation failed opens the Player profile once it is dismissed and keeps the stored game",
    role: "ROLE_ADMIN",
    redirect: `${ORIGIN}/start`,
    invitationError: "GAME_ALREADY_STARTED",
    from: "/statistics",
    storedGameId: 99,
    destination: ROUTES.playerProfile,
    currentGameId: 99,
  },
];

function buildAnswer(testCase: PostAuthCase): AuthenticatedUser {
  return {
    success: true,
    roles: testCase.role === "ROLE_ADMIN" ? ["ROLE_ADMIN", "ROLE_PLAYER"] : ["ROLE_PLAYER"],
    id: 23,
    email: "ton@db-n.com",
    username: "Ton Eighty",
    redirect: testCase.redirect,
    ...(testCase.gameId === undefined ? {} : { gameId: testCase.gameId }),
    ...(testCase.invitationError === undefined
      ? {}
      : { invitationError: testCase.invitationError }),
  };
}

/** Login and registration each read their answer through their own API call. */
const PATHS = [
  {
    path: "login",
    authenticate: (): Promise<AuthenticatedUser> =>
      loginWithCredentials({ email: "ton@db-n.com", password: "secret" }),
  },
  {
    path: "registration",
    authenticate: (): Promise<AuthenticatedUser> =>
      registerUser({ username: "ton80", email: "ton@db-n.com", password: "long-enough-secret" }),
  },
];

describe("post-auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(clientLogger, "warn").mockImplementation(() => undefined);
    vi.spyOn(clientLogger, "error").mockImplementation(() => undefined);
    queryClient.clear();
    setCurrentGameId(null);
  });

  afterEach(() => {
    setCurrentGameId(null);
  });

  describe.each(PATHS)("after $path", ({ authenticate }) => {
    it.each(CASES)("$name", async (testCase) => {
      const answer = buildAnswer(testCase);
      setCurrentGameId(testCase.storedGameId);
      vi.spyOn(apiClient, "post").mockImplementationOnce(respondWith(answer));

      const user = await authenticate();
      await acceptAuthenticatedUser(user);

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(answer);
      expect($currentGameId.get()).toBe(testCase.currentGameId);
      // useAuthRedirect waits while the invitation error shows; Go to player profile dismisses it.
      if (testCase.invitationError !== undefined) {
        dismissInvitationError();
      }
      const cachedUser = readCachedUser();
      expect(cachedUser.invitationError).toBeUndefined();
      expect(resolveAuthDestination(cachedUser, testCase.from)).toBe(testCase.destination);
      // Dismissing the invitation error leaves the current game as it was.
      expect($currentGameId.get()).toBe(testCase.currentGameId);
    });
  });

  describe("acceptAuthenticatedUser", () => {
    it("keeps the accepted user when a pending session check answers late with no user", async () => {
      let answerSessionCheck: (user: null) => void = () => undefined;
      vi.spyOn(apiClient, "get").mockReturnValueOnce(
        new Promise((resolve) => {
          answerSessionCheck = resolve;
        }),
      );
      const sessionCheck = queryClient.prefetchQuery(authQueries.me());
      const user = buildAnswer(JOINED_PLAYER);

      await acceptAuthenticatedUser(user);
      answerSessionCheck(null);
      await sessionCheck;

      expect(queryClient.getQueryData(AUTH_KEY)).toEqual(user);
    });
  });

  describe("dismissInvitationError", () => {
    it("drops the invitation error and points the cached user to the Player profile", async () => {
      const expected: AuthenticatedUser = {
        ...buildAnswer(REJECTED_PLAYER),
        redirect: ROUTES.playerProfile,
      };
      delete expected.invitationError;
      await acceptAuthenticatedUser(buildAnswer(REJECTED_PLAYER));

      dismissInvitationError();

      const dismissed = readCachedUser();
      expect(dismissed).toStrictEqual(expected);
      expect(resolveAuthDestination(dismissed, ROUTES.start())).toBe(ROUTES.playerProfile);
    });

    it("leaves an empty cache empty", () => {
      dismissInvitationError();

      expect(queryClient.getQueryData(AUTH_KEY)).toBeUndefined();
    });
  });
});
