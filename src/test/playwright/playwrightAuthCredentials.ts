const PLAYWRIGHT_AUTH_CREDENTIAL_ENV_NAMES = [
  "PLAYWRIGHT_TEST_EMAIL",
  "PLAYWRIGHT_TEST_PASSWORD",
] as const;

type PlaywrightAuthCredentialEnvName = (typeof PLAYWRIGHT_AUTH_CREDENTIAL_ENV_NAMES)[number];

type PlaywrightAuthTestEnv = Readonly<Record<string, string | undefined>>;

export type PlaywrightAuthTestCredentials = {
  email: string;
  password: string;
};

export type PlaywrightAuthCredentialResolution =
  | {
      isConfigured: true;
      credentials: PlaywrightAuthTestCredentials;
      missingVariableNames: [];
      skipReason: null;
    }
  | {
      isConfigured: false;
      credentials: null;
      missingVariableNames: PlaywrightAuthCredentialEnvName[];
      skipReason: string;
    };

function readEnvValue(
  env: PlaywrightAuthTestEnv,
  name: PlaywrightAuthCredentialEnvName,
): string | null {
  const value = env[name]?.trim();

  return value ? value : null;
}

export function resolvePlaywrightAuthTestCredentials(
  env: PlaywrightAuthTestEnv = process.env,
): PlaywrightAuthCredentialResolution {
  const email = readEnvValue(env, "PLAYWRIGHT_TEST_EMAIL");
  const password = readEnvValue(env, "PLAYWRIGHT_TEST_PASSWORD");
  const missingVariableNames = PLAYWRIGHT_AUTH_CREDENTIAL_ENV_NAMES.filter(
    (name) => readEnvValue(env, name) === null,
  );

  if (email && password) {
    return {
      isConfigured: true,
      credentials: {
        email,
        password,
      },
      missingVariableNames: [],
      skipReason: null,
    };
  }

  return {
    isConfigured: false,
    credentials: null,
    missingVariableNames,
    skipReason: `Missing ${missingVariableNames.join(
      ", ",
    )}. Provide them in .env/.env.local for local runs or as CI secrets to enable auth-dependent Playwright specs.`,
  };
}
