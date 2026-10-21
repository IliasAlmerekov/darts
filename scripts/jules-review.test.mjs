// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extractReview, parseNewLines, runJulesReview } from "./jules-review.mjs";

const JULES = "https://jules.googleapis.com/v1alpha";
const GITHUB = "https://api.github.com";

const env = {
  JULES_API_KEY: "jules-key",
  GITHUB_TOKEN: "gh-token",
  GITHUB_REPOSITORY: "acme/darts",
  PR_NUMBER: "7",
  HEAD_REF: "feat/7-score",
  HEAD_SHA: "abc123",
  BASE_REF: "main",
};

const diff = [
  "diff --git a/src/score.ts b/src/score.ts",
  "index 1111111..2222222 100644",
  "--- a/src/score.ts",
  "+++ b/src/score.ts",
  "@@ -10,3 +10,4 @@ export const score = () => {",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
  "+const c = 4;",
  " return a;",
  "",
].join("\n");

const reviewMessage = (review) =>
  `Done.\n<jules-review>\n${JSON.stringify(review)}\n</jules-review>`;

const json = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === undefined ? "" : JSON.stringify(body)),
});

// Answers each request from the first route whose "METHOD url" key matches, in order.
// A route given as an array answers one entry per call and repeats the last one.
const fakeFetch = (routes) => {
  const calls = [];
  const fetch = vi.fn(async (url, init = {}) => {
    const key = `${init.method ?? "GET"} ${url}`;
    calls.push({ key, headers: init.headers, body: init.body && JSON.parse(init.body) });
    const route = Object.keys(routes).find((pattern) => key === pattern);
    if (!route) throw new Error(`unexpected request: ${key}`);
    const answers = routes[route];
    if (!Array.isArray(answers)) return answers();
    return (answers.length > 1 ? answers.shift() : answers[0])();
  });
  return { fetch, calls };
};

const sessionRoutes = (states, activities) => ({
  [`POST ${JULES}/sessions`]: () =>
    json({ name: "sessions/42", id: "42", url: "https://jules.google.com/session/42" }),
  [`GET ${JULES}/sessions/42`]: states.map((state) => () => json({ name: "sessions/42", state })),
  [`GET ${JULES}/sessions/42/activities?pageSize=100`]: () => json({ activities }),
});

const run = (fetch, overrides = {}) =>
  runJulesReview({ env, diff, fetch, sleep: async () => {}, log: () => {}, ...overrides });

describe("runJulesReview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the diff to Jules and posts verified findings on diff lines inline", async () => {
    const review = {
      summary: "One bug.",
      findings: [
        {
          path: "src/score.ts",
          line: 11,
          severity: "major",
          title: "Wrong value",
          body: "Use 2.",
          evidence: { command: "npx vitest run src/score.test.ts", exitCode: 1 },
        },
        {
          path: "src/score.ts",
          line: 12,
          severity: "minor",
          title: "Unused",
          body: "",
          evidence: { quote: "const c = 4;" },
        },
      ],
    };
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(
        ["IN_PROGRESS", "COMPLETED"],
        [
          {
            artifacts: [
              {
                bashOutput: {
                  command: "cd /app && npx vitest run  src/score.test.ts",
                  output: "FAIL src/score.test.ts\nexpected 2, got 3",
                  exitCode: 1,
                },
              },
            ],
          },
          { agentMessaged: { agentMessage: reviewMessage(review) } },
        ],
      ),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    const result = await run(fetch);

    expect(result).toEqual({ status: "reviewed", inline: 2, general: 0, unverified: 0 });
    const create = calls.find((call) => call.key === `POST ${JULES}/sessions`);
    expect(create.headers["X-Goog-Api-Key"]).toBe("jules-key");
    expect(create.body.sourceContext).toEqual({
      source: "sources/github/acme/darts",
      githubRepoContext: { startingBranch: "feat/7-score" },
    });
    expect(create.body.prompt).toContain("+const c = 4;");
    expect(create.body.prompt).toContain('"evidence"');
    expect(create.body).not.toHaveProperty("automationMode");

    const posted = calls.find((call) => call.key.endsWith("/pulls/7/reviews"));
    expect(posted.headers.Authorization).toBe("Bearer gh-token");
    expect(posted.body).toMatchObject({ commit_id: "abc123", event: "COMMENT" });
    const [bug, unused] = posted.body.comments;
    expect(bug).toMatchObject({ path: "src/score.ts", line: 11, side: "RIGHT" });
    expect(bug.body).toContain("**major**: Wrong value\n\nUse 2.");
    expect(bug.body).toContain("Evidence: `npx vitest run src/score.test.ts` exited with 1.");
    expect(bug.body).toContain("expected 2, got 3");
    expect(unused).toMatchObject({ path: "src/score.ts", line: 12, side: "RIGHT" });
    expect(unused.body).toContain("Evidence: the quoted code matches the diff.");
    expect(posted.body.body).toContain("One bug.");
    expect(posted.body.body).toContain("https://jules.google.com/session/42");
  });

  it("keeps findings without evidence that checks out out of the inline comments", async () => {
    const finding = (title, line, evidence) => ({
      path: "src/score.ts",
      line,
      severity: "major",
      title,
      evidence,
    });
    const review = {
      summary: "Mixed.",
      findings: [
        finding("Not run", 11, { command: "npx vitest run src/fake.test.ts", exitCode: 1 }),
        finding("Wrong exit code", 11, { command: "npm test", exitCode: 2 }),
        finding("Passing command", 11, { command: "npm run lint", exitCode: 0 }),
        finding("Wrong quote", 10, { quote: "const a = 2;" }),
        finding("No evidence", 13),
        {
          path: "src/other.ts",
          line: 3,
          severity: "major",
          title: "Breaks a caller",
          evidence: { command: "npm run typecheck", exitCode: 2 },
        },
      ],
    };
    const runs = [
      { command: "npm test", output: "", exitCode: 1 },
      { command: "npm run lint", output: "", exitCode: 0 },
      { command: "npm run typecheck", output: "TS2345", exitCode: 2 },
    ];
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(
        ["COMPLETED"],
        [
          { artifacts: runs.map((bashOutput) => ({ bashOutput })) },
          { agentMessaged: { agentMessage: reviewMessage(review) } },
        ],
      ),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    await expect(run(fetch)).resolves.toEqual({
      status: "reviewed",
      inline: 0,
      general: 1,
      unverified: 5,
    });

    const posted = calls.find((call) => call.key.endsWith("/pulls/7/reviews"));
    expect(posted.body.comments).toEqual([]);
    const [verified, unverified] = posted.body.body.split("**Unverified findings**");
    expect(verified).toContain("`src/other.ts:3` Breaks a caller");
    expect(verified).toContain("`npm run typecheck` exited with 2.");
    for (const title of [
      "Not run",
      "Wrong exit code",
      "Passing command",
      "Wrong quote",
      "No evidence",
    ]) {
      expect(unverified).toContain(title);
    }
  });

  it("reads every page of activities", async () => {
    const review = { summary: "Clean.", findings: [] };
    const { fetch } = fakeFetch({
      ...sessionRoutes(["COMPLETED"], []),
      [`GET ${JULES}/sessions/42/activities?pageSize=100`]: () =>
        json({ activities: [{ progressUpdated: { title: "Reading" } }], nextPageToken: "p2" }),
      [`GET ${JULES}/sessions/42/activities?pageSize=100&pageToken=p2`]: () =>
        json({ activities: [{ agentMessaged: { agentMessage: reviewMessage(review) } }] }),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    await expect(run(fetch)).resolves.toEqual({
      status: "reviewed",
      inline: 0,
      general: 0,
      unverified: 0,
    });
  });

  it("approves the plan when the session waits for approval", async () => {
    const review = { summary: "Clean.", findings: [] };
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(
        ["AWAITING_PLAN_APPROVAL", "COMPLETED"],
        [{ agentMessaged: { agentMessage: reviewMessage(review) } }],
      ),
      [`POST ${JULES}/sessions/42:approvePlan`]: () => json({}),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    await run(fetch);

    expect(calls.map((call) => call.key)).toContain(`POST ${JULES}/sessions/42:approvePlan`);
  });

  it("keeps polling through transient Jules errors", async () => {
    const review = { summary: "Clean.", findings: [] };
    const { fetch } = fakeFetch({
      ...sessionRoutes([], [{ agentMessaged: { agentMessage: reviewMessage(review) } }]),
      [`GET ${JULES}/sessions/42`]: [
        () => json({ error: "unavailable" }, 503),
        () => json({ name: "sessions/42", state: "COMPLETED" }),
      ],
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    await expect(run(fetch)).resolves.toMatchObject({ status: "reviewed" });
  });

  it("posts the whole review as a PR comment when GitHub rejects the review", async () => {
    const review = {
      summary: "One bug.",
      findings: [
        {
          path: "src/score.ts",
          line: 11,
          severity: "major",
          title: "Wrong value",
          evidence: { quote: "const b = 3;" },
        },
      ],
    };
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(["COMPLETED"], [{ agentMessaged: { agentMessage: reviewMessage(review) } }]),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () =>
        json({ message: "Unprocessable" }, 422),
      [`POST ${GITHUB}/repos/acme/darts/issues/7/comments`]: () => json({ id: 2 }),
    });

    await expect(run(fetch)).resolves.toMatchObject({ status: "reviewed" });

    const comment = calls.find((call) => call.key.endsWith("/issues/7/comments"));
    expect(comment.body.body).toContain("`src/score.ts:11` Wrong value");
  });

  it("reports a failed session on the PR", async () => {
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(["FAILED"], [{ sessionFailed: { reason: "repository not connected" } }]),
      [`POST ${GITHUB}/repos/acme/darts/issues/7/comments`]: () => json({ id: 2 }),
    });

    await expect(run(fetch)).resolves.toEqual({
      status: "failed",
      reason: "repository not connected",
    });

    const comment = calls.find((call) => call.key.endsWith("/issues/7/comments"));
    expect(comment.body.body).toContain("repository not connected");
  });

  it("gives up after the poll limit", async () => {
    const { fetch } = fakeFetch({
      ...sessionRoutes(["IN_PROGRESS"], []),
      [`POST ${GITHUB}/repos/acme/darts/issues/7/comments`]: () => json({ id: 2 }),
    });

    await expect(run(fetch, { maxPolls: 3 })).resolves.toMatchObject({ status: "failed" });
    expect(fetch.mock.calls.filter(([url]) => url === `${JULES}/sessions/42`)).toHaveLength(3);
  });

  it("posts the last agent message when Jules returns no structured review", async () => {
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(["COMPLETED"], [{ agentMessaged: { agentMessage: "Looks fine to me." } }]),
      [`POST ${GITHUB}/repos/acme/darts/issues/7/comments`]: () => json({ id: 2 }),
    });

    await expect(run(fetch)).resolves.toEqual({ status: "unstructured" });

    const comment = calls.find((call) => call.key.endsWith("/issues/7/comments"));
    expect(comment.body.body).toContain("Looks fine to me.");
  });

  it("skips an empty diff without calling any API", async () => {
    const { fetch } = fakeFetch({});

    await expect(run(fetch, { diff: "  \n" })).resolves.toEqual({ status: "skipped" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses to start without the Jules API key", async () => {
    const { fetch } = fakeFetch({});

    await expect(run(fetch, { env: { ...env, JULES_API_KEY: "" } })).rejects.toThrow(
      "JULES_API_KEY",
    );
  });
});

describe("extractReview", () => {
  it("takes the latest valid block and normalises findings", () => {
    const older = { summary: "Old.", findings: [] };
    const newer = {
      summary: "New.",
      findings: [
        {
          path: "a.ts",
          line: 2,
          severity: "blocker",
          title: " Crash ",
          body: "x",
          evidence: { command: " npm test ", exitCode: 1 },
        },
        { path: "b.ts", line: 0, severity: "huge", title: "No line" },
        { path: "c.ts", line: 4 },
      ],
    };

    const review = extractReview([
      { agentMessaged: { agentMessage: reviewMessage(older) } },
      { agentMessaged: { agentMessage: reviewMessage(newer) } },
      { agentMessaged: { agentMessage: "<jules-review>not json</jules-review>" } },
    ]);

    expect(review).toEqual({
      summary: "New.",
      findings: [
        {
          path: "a.ts",
          line: 2,
          severity: "blocker",
          title: "Crash",
          body: "x",
          evidence: { command: "npm test", exitCode: 1, quote: null },
        },
        {
          path: "b.ts",
          line: null,
          severity: "minor",
          title: "No line",
          body: "",
          evidence: { command: null, exitCode: null, quote: null },
        },
      ],
      dropped: 1,
    });
  });

  it("reads a review that Jules wrote into a change set", () => {
    const patch = [
      "--- /dev/null",
      "+++ b/review.md",
      "@@ -0,0 +1,3 @@",
      "+<jules-review>",
      '+{"summary": "From patch.", "findings": []}',
      "+</jules-review>",
    ].join("\n");

    const review = extractReview([
      { artifacts: [{ changeSet: { gitPatch: { unidiffPatch: patch } } }] },
    ]);

    expect(review).toEqual({ summary: "From patch.", findings: [], dropped: 0 });
  });

  it("returns null when no block parses", () => {
    expect(extractReview([{ agentMessaged: { agentMessage: "no review" } }])).toBeNull();
  });
});

describe("parseNewLines", () => {
  it("collects added and context lines on the new side with their text", () => {
    expect(parseNewLines(diff)).toEqual(
      new Map([
        [
          "src/score.ts",
          new Map([
            [10, "const a = 1;"],
            [11, "const b = 3;"],
            [12, "const c = 4;"],
            [13, "return a;"],
          ]),
        ],
      ]),
    );
  });

  it("ignores deleted files", () => {
    const deleted = [
      "diff --git a/old.ts b/old.ts",
      "deleted file mode 100644",
      "--- a/old.ts",
      "+++ /dev/null",
      "@@ -1,1 +0,0 @@",
      "-gone",
    ].join("\n");

    expect(parseNewLines(deleted)).toEqual(new Map());
  });
});
