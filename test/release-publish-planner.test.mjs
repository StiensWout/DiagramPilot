import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { repoRoot } from "./docs-public-boundary-helpers.mjs";
import {
  assertProcessSuccess,
  runProcess,
  sanitizedTestEnv,
} from "./process-helpers.mjs";

const releasePlanScriptPath = path.join(
  repoRoot,
  "scripts",
  "plan-release-publish.mjs",
);

async function readWorkspaceVersion() {
  const manifest = JSON.parse(
    await readFile(path.join(repoRoot, "package.json"), "utf8"),
  );

  return manifest.version;
}

async function withGithubEvent(eventPayload, callback) {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), "diagrampilot-release-"));

  try {
    const eventPath = path.join(tempRoot, "event.json");
    await writeFile(eventPath, `${JSON.stringify(eventPayload, null, 2)}\n`, "utf8");

    return await callback(eventPath);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

function runReleasePlan(env) {
  return runProcess(process.execPath, [releasePlanScriptPath], {
    cwd: repoRoot,
    env: sanitizedTestEnv({
      DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "",
      ...env,
    }),
  });
}

function releasePlanEnv(eventPath, overrides) {
  return {
    GITHUB_EVENT_PATH: eventPath,
    GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
    GITHUB_RUN_ATTEMPT: "1",
    ...overrides,
  };
}

function parseSuccessfulPlan(result) {
  assertProcessSuccess(result);
  return JSON.parse(result.stdout);
}

function assertNightlyPlan(
  plan,
  { baseVersion, runNumber, runAttempt = "1", sha, shouldPublish = false, reason },
) {
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "nightly");
  assert.equal(plan.shouldPublish, shouldPublish);
  assert.equal(
    plan.publishVersion,
    `${baseVersion}-nightly.${runNumber}.${runAttempt}.${sha.slice(0, 7)}`,
  );
  assert.match(plan.reason, reason);
}

function assertLatestPlan(plan, { baseVersion, shouldPublish }) {
  assert.equal(plan.baseVersion, baseVersion);
  assert.equal(plan.distTag, "latest");
  assert.equal(plan.shouldPublish, shouldPublish);
  assert.equal(plan.publishVersion, baseVersion);
}

test("release publish planner routes feature branch pushes to unique nightly versions", async () => {
  const baseVersion = await readWorkspaceVersion();
  const sha = "abcdef1234567890";

  const result = await withGithubEvent({ ref: "refs/heads/feature/dp-61-release" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/feature/dp-61-release",
        GITHUB_REF_NAME: "feature/dp-61-release",
        GITHUB_RUN_NUMBER: "42",
        GITHUB_RUN_ATTEMPT: "3",
        GITHUB_SHA: sha,
        DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
      }),
    ),
  );

  const plan = parseSuccessfulPlan(result);
  assertNightlyPlan(plan, {
    baseVersion,
    runNumber: "42",
    runAttempt: "3",
    sha,
    shouldPublish: true,
    reason: /trusted feature branch push/u,
  });
});

test("release publish planner keeps main pushes validation-only", async () => {
  const baseVersion = await readWorkspaceVersion();

  const result = await withGithubEvent({ ref: "refs/heads/main" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_RUN_NUMBER: "43",
        GITHUB_SHA: "1234567890abcdef",
        DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
      }),
    ),
  );

  const plan = parseSuccessfulPlan(result);
  assertLatestPlan(plan, { baseVersion, shouldPublish: false });
  assert.match(plan.reason, /main push validation only/u);
});

test("release publish planner routes manual milestone dispatches to latest publishing", async () => {
  const baseVersion = await readWorkspaceVersion();

  const result = await withGithubEvent(
    {
      ref: "refs/heads/main",
      inputs: {
        release_kind: "milestone",
        version: baseVersion,
        milestone: "0.4.0",
        previous_tag: "v0.3.1",
      },
    },
    (eventPath) =>
      runReleasePlan(
        releasePlanEnv(eventPath, {
          GITHUB_EVENT_NAME: "workflow_dispatch",
          GITHUB_REF: "refs/heads/main",
          GITHUB_REF_NAME: "main",
          GITHUB_RUN_NUMBER: "49",
          GITHUB_SHA: "fed123456789abcd",
          DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
        }),
      ),
  );

  const plan = parseSuccessfulPlan(result);
  assertLatestPlan(plan, { baseVersion, shouldPublish: true });
  assert.equal(plan.releaseKind, "final");
  assert.equal(plan.releaseTag, `v${baseVersion}`);
  assert.equal(plan.milestone, "0.4.0");
  assert.equal(plan.previousTag, "v0.3.1");
  assert.match(plan.reason, /manual milestone release/u);
});

test("release publish planner keeps trusted pushes dry-run until publishing is enabled", async () => {
  const baseVersion = await readWorkspaceVersion();
  const sha = "abcdef1234567890";

  const result = await withGithubEvent({ ref: "refs/heads/feature/dp-61-release" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "push",
        GITHUB_REF: "refs/heads/feature/dp-61-release",
        GITHUB_REF_NAME: "feature/dp-61-release",
        GITHUB_RUN_NUMBER: "47",
        GITHUB_SHA: sha,
      }),
    ),
  );

  const plan = parseSuccessfulPlan(result);
  assertNightlyPlan(plan, {
    baseVersion,
    runNumber: "47",
    sha,
    reason: /real publish disabled/u,
  });
});

test("release publish planner keeps pull requests dry-run even when publishing is enabled", async () => {
  const baseVersion = await readWorkspaceVersion();
  const sha = "123abc456def7890";

  const result = await withGithubEvent(
    {
      pull_request: {
        head: { repo: { full_name: "StiensWout/DiagramPilot" } },
        base: { repo: { full_name: "StiensWout/DiagramPilot" } },
      },
    },
    (eventPath) =>
      runReleasePlan(
        releasePlanEnv(eventPath, {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/64/merge",
          GITHUB_REF_NAME: "64/merge",
          GITHUB_RUN_NUMBER: "48",
          GITHUB_SHA: sha,
          DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
        }),
      ),
  );

  const plan = parseSuccessfulPlan(result);
  assertNightlyPlan(plan, {
    baseVersion,
    runNumber: "48",
    sha,
    reason: /pull request validation uses dry-run/u,
  });
});

test("release publish planner keeps fork pull requests and manual runs dry-run only", async () => {
  const baseVersion = await readWorkspaceVersion();
  const forkSha = "fedcba9876543210";

  const forkResult = await withGithubEvent(
    {
      pull_request: {
        head: { repo: { full_name: "someone/DiagramPilot" } },
        base: { repo: { full_name: "StiensWout/DiagramPilot" } },
      },
    },
    (eventPath) =>
      runReleasePlan(
        releasePlanEnv(eventPath, {
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_REF: "refs/pull/12/merge",
          GITHUB_REF_NAME: "12/merge",
          GITHUB_RUN_NUMBER: "44",
          GITHUB_SHA: forkSha,
          DIAGRAMPILOT_NPM_PUBLISH_ENABLED: "true",
        }),
      ),
  );

  const forkPlan = parseSuccessfulPlan(forkResult);
  assertNightlyPlan(forkPlan, {
    baseVersion,
    runNumber: "44",
    sha: forkSha,
    reason: /fork pull request/u,
  });

  const manualSha = "0123456789abcdef";
  const manualRun = await withGithubEvent({ ref: "refs/heads/main" }, (eventPath) =>
    runReleasePlan(
      releasePlanEnv(eventPath, {
        GITHUB_EVENT_NAME: "workflow_dispatch",
        GITHUB_REF: "refs/heads/main",
        GITHUB_REF_NAME: "main",
        GITHUB_RUN_NUMBER: "45",
        GITHUB_SHA: manualSha,
      }),
    ),
  );

  const manualPlan = parseSuccessfulPlan(manualRun);
  assertLatestPlan(manualPlan, { baseVersion, shouldPublish: false });
  assert.equal(manualPlan.releaseKind, "dry-run");
  assert.match(manualPlan.reason, /manual dry-run/u);
});

test("release publish planner rejects tag refs that do not match the shared version", async () => {
  const result = await withGithubEvent({ ref: "refs/tags/v9.9.9" }, (eventPath) =>
    runReleasePlan({
      GITHUB_EVENT_NAME: "push",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_REF: "refs/tags/v9.9.9",
      GITHUB_REF_NAME: "v9.9.9",
      GITHUB_REPOSITORY: "StiensWout/DiagramPilot",
      GITHUB_RUN_NUMBER: "46",
      GITHUB_RUN_ATTEMPT: "1",
      GITHUB_SHA: "9999999999999999",
    }),
  );

  assert.equal(result.signal, null);
  assert.equal(result.code, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Tag v9\.9\.9 does not match shared version/u);
});
