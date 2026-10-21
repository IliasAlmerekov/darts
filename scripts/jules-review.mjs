// Asks Jules to review a pull request and posts the result on the PR. Run by
// .github/workflows/jules-review.yml, which writes the PR diff to the file in DIFF_FILE.
// The diff goes into the prompt because a Jules session starts from the branch alone and
// does not reliably rebuild the PR's exact diff.
// Jules API: https://developers.google.com/jules/api/reference/rest
// The script creates a session, polls GET /v1alpha/sessions/{id} until it ends, reads the
// review Jules wrote to .jules/review.json from the session's activities, and checks each finding's evidence against the
// session's command log and the diff. It posts a PR review: verified findings on diff lines
// become inline comments, the rest go into the review body, unverified ones in their own list.
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const JULES_API = "https://jules.googleapis.com/v1alpha";
const GITHUB_API = "https://api.github.com";
const REVIEW_FILE = ".jules/review.json";
const REVIEW_START = "<jules-review>";
const REVIEW_END = "</jules-review>";
const COMMENT_MARKER = "<!-- jules-review -->";
const SEVERITIES = ["blocker", "major", "minor", "nit"];
// AWAITING_USER_FEEDBACK ends the wait too: the prompt forbids questions, so nobody answers.
const DONE_STATES = new Set(["COMPLETED", "FAILED", "AWAITING_USER_FEEDBACK"]);
const MAX_POLL_FAILURES = 5;
// shortcut: a fixed cap keeps the prompt to a size Jules accepts, and findings in the cut
// part are lost. Split the diff per file when PRs often pass this size.
const MAX_DIFF_CHARS = 150_000;
// GitHub rejects comment bodies over 65,536 characters.
const MAX_BODY_CHARS = 60_000;

class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

const requestJson = async (fetch, url, { method = "GET", headers, body } = {}) => {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? headers : { ...headers, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new HttpError(
      `${method} ${url} failed with ${response.status}: ${text}`,
      response.status,
    );
  }
  return text === "" ? {} : JSON.parse(text);
};

const createJulesClient = (fetch, apiKey) => {
  const headers = { "X-Goog-Api-Key": apiKey };
  const call = (path, options = {}) =>
    requestJson(fetch, `${JULES_API}/${path}`, { ...options, headers });

  return {
    createSession: (session) => call("sessions", { method: "POST", body: session }),
    getSession: (name) => call(name),
    approvePlan: (name) => call(`${name}:approvePlan`, { method: "POST", body: {} }),
    listActivities: async (name) => {
      const activities = [];
      let pageToken;
      do {
        const query = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
        const page = await call(`${name}/activities?pageSize=100${query}`);
        activities.push(...(page.activities ?? []));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return activities;
    },
  };
};

const createGithubClient = (fetch, token, repository, prNumber) => {
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "jules-review",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const post = (path, body) =>
    requestJson(fetch, `${GITHUB_API}/repos/${repository}/${path}`, {
      method: "POST",
      headers,
      body,
    });

  return {
    createReview: (review) => post(`pulls/${prNumber}/reviews`, review),
    postComment: (body) => post(`issues/${prNumber}/comments`, { body }),
  };
};

const buildPrompt = ({ repository, prNumber, baseRef, headRef, diff }) => {
  const truncated = diff.length > MAX_DIFF_CHARS;
  const shownDiff = truncated ? diff.slice(0, MAX_DIFF_CHARS) : diff;

  return `Review pull request #${prNumber} in ${repository}. The branch \`${headRef}\` is checked out; it merges into \`${baseRef}\`.

This task is a code review, not a fix. Your deliverable is one new file, \`${REVIEW_FILE}\`, and nothing else: do not edit any existing file, even to fix a bug you find; report the bug instead. Do not ask questions: nobody will answer.

Review only the changes in the diff below. Read other files in the repository when a change depends on them. You may install dependencies, run commands and tests, and write temporary test files to reproduce a problem. Delete every temporary file before you finish, so the only change left is \`${REVIEW_FILE}\`.

Report bugs, security problems, broken edge cases, missing tests, and breaches of the rules in AGENTS.md and docs/convention/. Skip points a linter or formatter catches.

Write the review to \`${REVIEW_FILE}\` as JSON of this shape, then end the session:

{"summary": "Two sentences at most.", "findings": [{"path": "src/a.ts", "line": 12, "severity": "major", "title": "One line", "body": "What breaks, when, and the fix.", "evidence": {"command": "npx vitest run src/a.test.ts", "exitCode": 1}}]}

- "path" is relative to the repository root, as in the diff header.
- "line" is the line number in the new version of the file, on a line the diff adds or shows as context.
- "severity" is one of: ${SEVERITIES.join(", ")}.
- "findings" is an empty array when nothing needs a change.
- "evidence" proves the finding. A finding without valid evidence is shown as unverified. Use one of:
  - {"command": "...", "exitCode": N}: a command you ran in this session that fails because of the problem, as you typed it, with its non-zero exit code. A failing test you wrote counts. Prefer this for bugs.
  - {"quote": "..."}: the exact text of the file at "path" from "line" on, one or more whole lines joined with \\n, copied from the new version.
  Evidence is checked against this session's command log and the diff; do not invent it.
${truncated ? `\nThe diff is cut at ${MAX_DIFF_CHARS} characters; say so in the summary.\n` : ""}
<diff>
${shownDiff}
</diff>`;
};

// Maps each file in a unified diff to its new-file lines a review comment may target, added
// lines and context lines inside hunks, keyed by line number.
export const parseNewLines = (diff) => {
  const lines = new Map();
  let path = null;
  let newLine = 0;

  for (const row of diff.split("\n")) {
    if (row.startsWith("diff --git ")) {
      path = null;
      newLine = 0;
    } else if (newLine === 0 && row.startsWith("+++ ")) {
      const target = row.slice(4);
      path = target === "/dev/null" ? null : target.replace(/^b\//, "");
      if (path !== null) lines.set(path, new Map());
    } else if (row.startsWith("@@ ")) {
      newLine = Number(/^@@ -\d+(?:,\d+)? \+(\d+)/.exec(row)?.[1] ?? 0);
    } else if (path !== null && newLine > 0 && (row.startsWith("+") || row.startsWith(" "))) {
      lines.get(path).set(newLine, row.slice(1));
      newLine += 1;
    }
  }
  return lines;
};

// The review file's content in a change set, read from the patch's new-file lines.
const reviewFileContent = (patch) => {
  const lines = parseNewLines(patch).get(REVIEW_FILE);
  return lines === undefined ? null : [...lines.values()].join("\n");
};

// Messages where Jules may have put a <jules-review> block instead of writing the file.
const activityMessages = (activity) =>
  [activity.agentMessaged?.agentMessage, activity.progressUpdated?.description].filter(
    (text) => typeof text === "string",
  );

const normalizeEvidence = (raw) => ({
  command:
    typeof raw?.command === "string" && raw.command.trim() !== "" ? raw.command.trim() : null,
  exitCode: Number.isInteger(raw?.exitCode) ? raw.exitCode : null,
  quote: typeof raw?.quote === "string" && raw.quote.trim() !== "" ? raw.quote : null,
});

const normalizeFinding = (raw) => {
  if (typeof raw?.title !== "string" || raw.title.trim() === "") return null;
  return {
    path: typeof raw.path === "string" && raw.path !== "" ? raw.path : null,
    line: Number.isInteger(raw.line) && raw.line > 0 ? raw.line : null,
    severity: SEVERITIES.includes(raw.severity) ? raw.severity : "minor",
    title: raw.title.trim(),
    body: typeof raw.body === "string" ? raw.body.trim() : "",
    evidence: normalizeEvidence(raw.evidence),
  };
};

const parseReviewJson = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
  } catch {
    return null;
  }
  if (typeof parsed?.summary !== "string" || !Array.isArray(parsed.findings)) return null;

  const findings = parsed.findings.map(normalizeFinding).filter((finding) => finding !== null);
  return {
    summary: parsed.summary.trim(),
    findings,
    dropped: parsed.findings.length - findings.length,
  };
};

const parseReviewBlock = (text) => {
  const start = text.lastIndexOf(REVIEW_START);
  const end = text.indexOf(REVIEW_END, start);
  return start === -1 || end === -1
    ? null
    : parseReviewJson(text.slice(start + REVIEW_START.length, end));
};

// Returns the newest review that parses, or null when Jules wrote none. The review file in a
// change set comes first; a <jules-review> block in a message is the fallback.
export const extractReview = (activities) => {
  const newestFirst = [...activities].reverse();
  for (const activity of newestFirst) {
    for (const artifact of activity.artifacts ?? []) {
      const patch = artifact.changeSet?.gitPatch?.unidiffPatch;
      const content = typeof patch === "string" ? reviewFileContent(patch) : null;
      const review = content === null ? null : parseReviewJson(content);
      if (review) return review;
    }
  }
  for (const activity of newestFirst) {
    for (const text of activityMessages(activity)) {
      const review = parseReviewBlock(text);
      if (review) return review;
    }
  }
  return null;
};

// Jules runs commands from its checkout, sometimes behind `cd <dir> &&` or `cd <dir>;`. Only
// those prefixes are stripped; the rest must match exactly, so evidence naming one test file
// does not match a run that covered more.
const normalizeCommand = (text) =>
  text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^(?:cd \S+ ?(?:&&|;) ?)+/, "");

// A fence longer than any backtick run in the text, so command output cannot close it.
const codeBlock = (text) => {
  const fence = "`".repeat(Math.max(3, ...(text.match(/`+/g) ?? []).map((run) => run.length + 1)));
  return `${fence}text\n${text}\n${fence}`;
};

const outputTail = (output) => {
  const tail = output.trimEnd().split("\n").slice(-20).join("\n");
  return tail.length > 1_500 ? tail.slice(-1_500) : tail;
};

// Returns the proof text for a finding, or null when its evidence does not check out. A
// command counts only if this session's log holds a run of it with the same non-zero exit
// code.
// A quote counts only if its lines match the diff's new-file lines from the finding's line on.
const verifyFinding = (finding, newLines, runs) => {
  const { command, exitCode, quote } = finding.evidence;
  if (command !== null && exitCode !== null && exitCode !== 0) {
    const run = runs.find(
      (candidate) =>
        candidate.exitCode === exitCode &&
        normalizeCommand(candidate.command) === normalizeCommand(command),
    );
    if (run) {
      const output = outputTail(run.output);
      const details =
        output === ""
          ? ""
          : `\n\n<details><summary>Output</summary>\n\n${codeBlock(output)}\n\n</details>`;
      return `\`${command}\` exited with ${exitCode}.${details}`;
    }
  }
  if (quote !== null && finding.line !== null) {
    const fileLines = newLines.get(finding.path);
    const matches = quote
      .split("\n")
      .every((text, offset) => fileLines?.get(finding.line + offset)?.trim() === text.trim());
    if (matches) return "the quoted code matches the diff.";
  }
  return null;
};

const commandRuns = (activities) =>
  activities.flatMap((activity) =>
    (activity.artifacts ?? [])
      .map((artifact) => artifact.bashOutput)
      .filter((run) => typeof run?.command === "string" && Number.isInteger(run.exitCode))
      .map((run) => ({ ...run, output: typeof run.output === "string" ? run.output : "" })),
  );

const lastAgentMessage = (activities) =>
  activities.findLast((activity) => activity.agentMessaged)?.agentMessaged.agentMessage ?? "";

const truncate = (text) =>
  text.length > MAX_BODY_CHARS ? `${text.slice(0, MAX_BODY_CHARS)}\n\n…(truncated)` : text;

const withProof = ({ body, proof }) =>
  [body, proof === null ? "" : `Evidence: ${proof}`].filter((text) => text !== "").join("\n\n");

const formatFinding = (finding) => {
  const { path, line, severity, title } = finding;
  const location = path === null ? "" : `\`${line === null ? path : `${path}:${line}`}\` `;
  const detail = withProof(finding);
  return `- **${severity}** ${location}${title}${detail === "" ? "" : `\n${detail.replace(/^/gm, "  ")}`}`;
};

const formatReviewBody = ({ review, listed, unverified, inlineCount, sessionLink }) => {
  const parts = [COMMENT_MARKER, "### Jules review", review.summary];
  if (listed.length > 0) {
    const heading = inlineCount > 0 ? "Verified findings outside the diff" : "Verified findings";
    parts.push(`**${heading}**\n\n${listed.map(formatFinding).join("\n")}`);
  }
  if (unverified.length > 0) {
    parts.push(
      `**Unverified findings**: Jules gave no command run or quote that checks out. Confirm before acting.\n\n${unverified.map(formatFinding).join("\n")}`,
    );
  }
  if (review.dropped > 0) parts.push(`${review.dropped} finding(s) without a title were dropped.`);
  parts.push(`${inlineCount} inline comment(s). ${sessionLink}`);
  return truncate(parts.join("\n\n"));
};

const requireEnv = (env, names) => {
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(", ")}`);
};

const waitForSession = async ({ jules, name, sleep, pollMs, maxPolls, log }) => {
  let failures = 0;
  let lastState;
  for (let poll = 0; poll < maxPolls; poll += 1) {
    await sleep(pollMs);
    let session;
    try {
      session = await jules.getSession(name);
      failures = 0;
    } catch (error) {
      failures += 1;
      if (failures >= MAX_POLL_FAILURES) throw error;
      log(`Polling ${name} failed (${failures}/${MAX_POLL_FAILURES}): ${error.message}`);
      continue;
    }
    if (session.state !== lastState) log(`Session state: ${session.state}`);
    lastState = session.state;
    if (DONE_STATES.has(session.state)) return { finished: session, lastState };
    if (session.state === "AWAITING_PLAN_APPROVAL") await jules.approvePlan(name);
  }
  return { finished: null, lastState };
};

export const runJulesReview = async ({
  env,
  diff,
  fetch = globalThis.fetch,
  sleep = delay,
  log = console.log,
  pollMs = 30_000,
  maxPolls = 90,
}) => {
  requireEnv(env, [
    "JULES_API_KEY",
    "GITHUB_TOKEN",
    "GITHUB_REPOSITORY",
    "PR_NUMBER",
    "HEAD_REF",
    "HEAD_SHA",
    "BASE_REF",
  ]);
  if (diff.trim() === "") {
    log("The diff is empty; nothing to review.");
    return { status: "skipped" };
  }

  const repository = env.GITHUB_REPOSITORY;
  const prNumber = env.PR_NUMBER;
  const jules = createJulesClient(fetch, env.JULES_API_KEY);
  const github = createGithubClient(fetch, env.GITHUB_TOKEN, repository, prNumber);

  // No automationMode: Jules must not push a branch or open a PR for a review.
  const session = await jules.createSession({
    title: `Review PR #${prNumber}`,
    prompt: buildPrompt({
      repository,
      prNumber,
      baseRef: env.BASE_REF,
      headRef: env.HEAD_REF,
      diff,
    }),
    sourceContext: {
      source: `sources/github/${repository}`,
      githubRepoContext: { startingBranch: env.HEAD_REF },
    },
    requirePlanApproval: false,
  });
  log(`Jules session ${session.name} started: ${session.url ?? "no URL returned"}`);

  const { finished, lastState } = await waitForSession({
    jules,
    name: session.name,
    sleep,
    pollMs,
    maxPolls,
    log,
  });
  const url = finished?.url ?? session.url;
  const sessionLink = url ? `[Jules session](${url})` : `Jules session \`${session.name}\``;

  if (finished === null || finished.state === "FAILED") {
    const reason =
      finished === null
        ? `no result after ${Math.round((pollMs * maxPolls) / 60_000)} minutes, last state ${lastState ?? "unknown"}`
        : ((await jules.listActivities(session.name)).findLast((activity) => activity.sessionFailed)
            ?.sessionFailed.reason ?? "the session failed without a reason");
    await github.postComment(
      `${COMMENT_MARKER}\nJules review did not finish: ${reason}. ${sessionLink}`,
    );
    return { status: "failed", reason };
  }

  const activities = await jules.listActivities(session.name);
  const review = extractReview(activities);
  if (review === null) {
    const message = lastAgentMessage(activities) || "(no message)";
    await github.postComment(
      truncate(
        `${COMMENT_MARKER}\nJules finished without a structured review (state ${finished.state}). ${sessionLink}\n\nLast message:\n\n${message.replace(/^/gm, "> ")}`,
      ),
    );
    return { status: "unstructured" };
  }

  const newLines = parseNewLines(diff);
  const runs = commandRuns(activities);
  const checked = review.findings.map((finding) => ({
    ...finding,
    proof: verifyFinding(finding, newLines, runs),
  }));
  const verified = checked.filter((finding) => finding.proof !== null);
  const unverified = checked.filter((finding) => finding.proof === null);
  // Only verified findings become inline comments; unverified ones stay in the body.
  const onDiff = (finding) => newLines.get(finding.path)?.has(finding.line) ?? false;
  const inline = verified.filter(onDiff);
  const listed = verified.filter((finding) => !onDiff(finding));

  try {
    await github.createReview({
      commit_id: env.HEAD_SHA,
      event: "COMMENT",
      body: formatReviewBody({
        review,
        listed,
        unverified,
        inlineCount: inline.length,
        sessionLink,
      }),
      comments: inline.map((finding) => ({
        path: finding.path,
        line: finding.line,
        side: "RIGHT",
        body: truncate(`**${finding.severity}**: ${finding.title}\n\n${withProof(finding)}`),
      })),
    });
  } catch (error) {
    // 422 means GitHub refused a comment position, for example after a force-push.
    if (error.status !== 422) throw error;
    log(`GitHub rejected the review, posting a plain comment instead: ${error.message}`);
    await github.postComment(
      formatReviewBody({ review, listed: verified, unverified, inlineCount: 0, sessionLink }),
    );
  }
  return {
    status: "reviewed",
    inline: inline.length,
    general: listed.length,
    unverified: unverified.length,
  };
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const diff = readFileSync(process.env.DIFF_FILE ?? "", "utf-8");
    const { status } = await runJulesReview({ env: process.env, diff });
    // A review that did not land on the PR fails the job, so nobody mistakes it for a pass.
    if (status === "failed" || status === "unstructured") process.exitCode = 1;
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
