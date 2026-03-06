type AuthTestCredentials = {
  email: string;
  password: string;
};

function requireEnvVariable(name: "PLAYWRIGHT_TEST_EMAIL" | "PLAYWRIGHT_TEST_PASSWORD"): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Missing ${name}. Set it in .env/.env.local for local runs or provide it as a CI secret.`,
    );
  }

  return value;
}

export function getAuthTestCredentials(): AuthTestCredentials {
  return {
    email: requireEnvVariable("PLAYWRIGHT_TEST_EMAIL"),
    password: requireEnvVariable("PLAYWRIGHT_TEST_PASSWORD"),
  };
}
