#!/usr/bin/env node

import { appendFileSync, readFileSync } from "node:fs";

const OFFICIAL_REPOSITORY = "StiensWout/DiagramPilot";
const PLAIN_RELEASE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/u;
const SAFE_PRERELEASE_IDENTIFIER_PATTERN = /^[0-9A-Za-z-]+$/u;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readEvent(path) {
  if (path === undefined || path === "") {
    return {};
  }

  return readJson(path);
}

function requireSafeIdentifier(name, value) {
  if (!SAFE_PRERELEASE_IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`${name} is missing or is not safe for a semver prerelease.`);
  }
}

function createNightlyVersion(baseVersion, env) {
  const runNumber = env.GITHUB_RUN_NUMBER ?? "";
  const runAttempt = env.GITHUB_RUN_ATTEMPT ?? "";
  const shortSha = (env.GITHUB_SHA ?? "").slice(0, 7);

  requireSafeIdentifier("GITHUB_RUN_NUMBER", runNumber);
  requireSafeIdentifier("GITHUB_RUN_ATTEMPT", runAttempt);
  requireSafeIdentifier("GITHUB_SHA", shortSha);

  return `${baseVersion}-nightly.${runNumber}.${runAttempt}.${shortSha}`;
}

function isOfficialRepository(env) {
  return env.GITHUB_REPOSITORY === OFFICIAL_REPOSITORY;
}

function isForkPullRequest(event) {
  const headRepo = pullRequestRepoFullName(event, "head");
  const baseRepo = pullRequestRepoFullName(event, "base");

  return hasComparablePullRequestRepos(headRepo, baseRepo) && headRepo !== baseRepo;
}

function pullRequestRepoFullName(event, side) {
  return event.pull_request?.[side]?.repo?.full_name;
}

function hasComparablePullRequestRepos(headRepo, baseRepo) {
  return headRepo !== undefined && baseRepo !== undefined;
}

function isPublishEnabled(env) {
  return env.DIAGRAMPILOT_NPM_PUBLISH_ENABLED === "true";
}

function guardPublish(plan, env) {
  if (plan.shouldPublish === false || isPublishEnabled(env)) {
    return plan;
  }

  return {
    ...plan,
    shouldPublish: false,
    reason: `${plan.reason}; real publish disabled until DIAGRAMPILOT_NPM_PUBLISH_ENABLED is true`,
  };
}

function createTagPlan(baseVersion, refName) {
  const tagVersion = refName.replace(/^v/u, "");

  if (tagVersion !== baseVersion) {
    throw new Error(
      `Tag ${refName} does not match shared version ${baseVersion}.`,
    );
  }

  return {
    baseVersion,
    distTag: "latest",
    publishVersion: baseVersion,
    shouldPublish: false,
    reason:
      "tag validation dry-run; latest publishing runs from merged main only",
  };
}

function createPushPlan(baseVersion, nightlyVersion, ref, env) {
  if (!isOfficialRepository(env)) {
    return undefined;
  }

  if (ref === "refs/heads/main") {
    return {
      baseVersion,
      distTag: "latest",
      publishVersion: baseVersion,
      shouldPublish: false,
      reason:
        "trusted main push validation only; latest publishing runs from a manual milestone release",
    };
  }

  if (ref.startsWith("refs/heads/feature/")) {
    return {
      baseVersion,
      distTag: "nightly",
      publishVersion: nightlyVersion,
      shouldPublish: true,
      reason: "trusted feature branch push publishes a unique nightly version",
    };
  }

  return undefined;
}

function createPullRequestPlan(baseVersion, nightlyVersion, event) {
  if (isForkPullRequest(event)) {
    return {
      baseVersion,
      distTag: "nightly",
      publishVersion: nightlyVersion,
      shouldPublish: false,
      reason: "fork pull request uses dry-run validation only",
    };
  }

  return {
    baseVersion,
    distTag: "nightly",
    publishVersion: nightlyVersion,
    shouldPublish: false,
    reason:
      "pull request validation uses dry-run only; feature branch pushes publish nightly",
  };
}

function dryRunPlan(baseVersion, nightlyVersion, reason) {
  return {
    baseVersion,
    distTag: "nightly",
    publishVersion: nightlyVersion,
    shouldPublish: false,
    reason,
  };
}

function requirePlainBaseVersion() {
  const baseVersion = readJson("package.json").version;

  if (!PLAIN_RELEASE_VERSION_PATTERN.test(baseVersion)) {
    throw new Error(
      `Shared version ${baseVersion} is not a plain release version like 0.1.8.`,
    );
  }

  return baseVersion;
}

function createPlanContext(env, event) {
  const baseVersion = requirePlainBaseVersion();
  const ref = githubRef(env, event);

  return {
    baseVersion,
    env,
    event,
    eventName: githubEventName(env),
    ref,
    refName: githubRefName(env, ref),
    nightlyVersion: createNightlyVersion(baseVersion, env),
  };
}

function githubRef(env, event) {
  return env.GITHUB_REF ?? event.ref ?? "";
}

function githubEventName(env) {
  return env.GITHUB_EVENT_NAME ?? "";
}

function githubRefName(env, ref) {
  return env.GITHUB_REF_NAME ?? ref.replace(/^refs\/(?:heads|tags)\//u, "");
}

function createPushEventPlan(context) {
  const pushPlan = createPushPlan(
    context.baseVersion,
    context.nightlyVersion,
    context.ref,
    context.env,
  );
  const plan = pushPlan ?? dryRunPlan(
    context.baseVersion,
    context.nightlyVersion,
    "untrusted or unsupported release event uses dry-run validation only",
  );

  return guardPublish(plan, context.env);
}

const planFactories = [
  {
    matches: (context) => context.ref.startsWith("refs/tags/"),
    create: (context) => createTagPlan(context.baseVersion, context.refName),
  },
  {
    matches: (context) => context.eventName === "push",
    create: createPushEventPlan,
  },
  {
    matches: (context) => context.eventName === "pull_request",
    create: (context) =>
      createPullRequestPlan(
        context.baseVersion,
        context.nightlyVersion,
        context.event,
      ),
  },
  {
    matches: (context) => context.eventName === "workflow_dispatch",
    create: (context) =>
      dryRunPlan(
        context.baseVersion,
        context.nightlyVersion,
        "manual dry-run validation only",
      ),
  },
];

function defaultPlan(context) {
  return dryRunPlan(
    context.baseVersion,
    context.nightlyVersion,
    "untrusted or unsupported release event uses dry-run validation only",
  );
}

function createPlan(env, event) {
  const context = createPlanContext(env, event);
  const factory = planFactories.find((candidate) => candidate.matches(context));

  return factory === undefined
    ? defaultPlan(context)
    : factory.create(context);
}

function appendOutputs(plan, outputPath) {
  if (outputPath === undefined || outputPath === "") {
    return;
  }

  appendFileSync(
    outputPath,
    [
      `base_version=${plan.baseVersion}`,
      `publish_version=${plan.publishVersion}`,
      `dist_tag=${plan.distTag}`,
      `should_publish=${String(plan.shouldPublish)}`,
      `reason=${plan.reason}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function appendEnvironment(plan, envPath) {
  if (envPath === undefined || envPath === "") {
    return;
  }

  appendFileSync(
    envPath,
    [
      `RELEASE_BASE_VERSION=${plan.baseVersion}`,
      `RELEASE_PUBLISH_VERSION=${plan.publishVersion}`,
      `RELEASE_DIST_TAG=${plan.distTag}`,
      `RELEASE_SHOULD_PUBLISH=${String(plan.shouldPublish)}`,
      `RELEASE_PLAN_REASON=${plan.reason}`,
      "",
    ].join("\n"),
    "utf8",
  );
}

function main() {
  const args = process.argv.slice(2);
  const writeGithubOutputs = args.includes("--github-output");

  if (args.some((arg) => arg !== "--github-output")) {
    throw new Error("Usage: node scripts/plan-release-publish.mjs [--github-output]");
  }

  const event = readEvent(process.env.GITHUB_EVENT_PATH);
  const plan = createPlan(process.env, event);

  if (writeGithubOutputs) {
    appendOutputs(plan, process.env.GITHUB_OUTPUT);
    appendEnvironment(plan, process.env.GITHUB_ENV);
  }

  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to plan DiagramPilot release publish: ${message}\n`);
  process.exitCode = 1;
}
