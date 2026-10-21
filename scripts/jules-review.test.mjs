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

  it("sends the diff to Jules and posts findings with a matching quote inline", async () => {
    const review = {
      summary: "One bug.",
      findings: [
        {
          path: "src/score.ts",
          line: 11,
          severity: "major",
          title: "Wrong value",
          body: "Use 2.",
          quote: "const b = 3;\nconst c = 4;",
        },
      ],
    };
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(
        ["IN_PROGRESS", "COMPLETED"],
        [{ agentMessaged: { agentMessage: reviewMessage(review) } }],
      ),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    const result = await run(fetch);

    expect(result).toEqual({ status: "reviewed", inline: 1, unverified: 0 });
    const create = calls.find((call) => call.key === `POST ${JULES}/sessions`);
    expect(create.headers["X-Goog-Api-Key"]).toBe("jules-key");
    expect(create.body.sourceContext).toEqual({
      source: "sources/github/acme/darts",
      githubRepoContext: { startingBranch: "feat/7-score" },
    });
    expect(create.body.prompt).toContain("+const c = 4;");
    expect(create.body.prompt).toContain("Do not install dependencies, run commands or tests");
    expect(create.body).not.toHaveProperty("automationMode");

    const posted = calls.find((call) => call.key.endsWith("/pulls/7/reviews"));
    expect(posted.headers.Authorization).toBe("Bearer gh-token");
    expect(posted.body).toMatchObject({ commit_id: "abc123", event: "COMMENT" });
    expect(posted.body.comments).toEqual([
      { path: "src/score.ts", line: 11, side: "RIGHT", body: "**major**: Wrong value\n\nUse 2." },
    ]);
    expect(posted.body.body).toContain("One bug.");
    expect(posted.body.body).toContain("https://jules.google.com/session/42");
  });

  it("lists findings whose quote is missing or does not match the diff as unverified", async () => {
    const finding = (title, path, line, quote) => ({ path, line, severity: "major", title, quote });
    const review = {
      summary: "Mixed.",
      findings: [
        finding("Wrong text", "src/score.ts", 10, "const a = 2;"),
        finding("Wrong line", "src/score.ts", 12, "const b = 3;"),
        finding("Runs past the hunk", "src/score.ts", 13, "return a;\n}"),
        finding("Outside the diff", "src/other.ts", 3, "const x = 1;"),
        finding("No quote", "src/score.ts", 11),
        finding("No line", "src/score.ts", undefined, "const b = 3;"),
      ],
    };
    const { fetch, calls } = fakeFetch({
      ...sessionRoutes(["COMPLETED"], [{ agentMessaged: { agentMessage: reviewMessage(review) } }]),
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    await expect(run(fetch)).resolves.toEqual({ status: "reviewed", inline: 0, unverified: 6 });

    const posted = calls.find((call) => call.key.endsWith("/pulls/7/reviews"));
    expect(posted.body.comments).toEqual([]);
    const [, unverified] = posted.body.body.split("**Unverified findings**");
    for (const { title } of review.findings) expect(unverified).toContain(title);
  });

  it("posts the review as soon as it appears, while the session still runs", async () => {
    const review = { summary: "Clean.", findings: [] };
    const { fetch } = fakeFetch({
      ...sessionRoutes(["IN_PROGRESS"], []),
      [`GET ${JULES}/sessions/42/activities?pageSize=100`]: [
        () => json({ activities: [{ progressUpdated: { title: "Reading" } }] }),
        () => json({ activities: [{ agentMessaged: { agentMessage: reviewMessage(review) } }] }),
      ],
      [`POST ${GITHUB}/repos/acme/darts/pulls/7/reviews`]: () => json({ id: 1 }),
    });

    await expect(run(fetch)).resolves.toMatchObject({ status: "reviewed" });
    expect(fetch.mock.calls.filter(([url]) => url === `${JULES}/sessions/42`)).toHaveLength(2);
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
          quote: "const b = 3;",
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

    await expect(run(fetch, { maxPolls: 3 })).resolves.toMatchObject({
      status: "failed",
      reason: expect.stringContaining("last state IN_PROGRESS"),
    });
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
          quote: "  crash();",
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
          quote: "  crash();",
        },
        {
          path: "b.ts",
          line: null,
          severity: "minor",
          title: "No line",
          body: "",
          quote: null,
        },
      ],
      dropped: 1,
    });
  });

  it("reads the review file from a change set and ignores other changed files", () => {
    const patch = [
      "diff --git a/src/score.ts b/src/score.ts",
      "--- a/src/score.ts",
      "+++ b/src/score.ts",
      "@@ -1,1 +1,1 @@",
      '-{"summary": "Not this one.", "findings": []}',
      '+{"summary": "Nor this one.", "findings": []}',
      "diff --git a/.jules/review.json b/.jules/review.json",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/.jules/review.json",
      "@@ -0,0 +1,4 @@",
      "+{",
      '+  "summary": "From the file.",',
      '+  "findings": []',
      "+}",
    ].join("\n");

    const review = extractReview([
      {
        agentMessaged: {
          agentMessage:
            '<jules-review>{"summary": "Older message.", "findings": []}</jules-review>',
        },
      },
      { artifacts: [{ changeSet: { gitPatch: { unidiffPatch: patch } } }] },
      { agentMessaged: { agentMessage: "Done." } },
    ]);

    expect(review).toEqual({ summary: "From the file.", findings: [], dropped: 0 });
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
