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
  const headRepo = event.pull_request?.head?.repo?.full_name;
  const baseRepo = event.pull_request?.base?.repo?.full_name;

  return headRepo !== undefined && baseRepo !== undefined && headRepo !== baseRepo;
}

function isTrustedPullRequest(event, env) {
  const headRepo = event.pull_request?.head?.repo?.full_name;
  const baseRepo = event.pull_request?.base?.repo?.full_name;

  return (
    isOfficialRepository(env) &&
    headRepo === OFFICIAL_REPOSITORY &&
    baseRepo === OFFICIAL_REPOSITORY
  );
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

function createPlan(env, event) {
  const baseVersion = readJson("package.json").version;

  if (!PLAIN_RELEASE_VERSION_PATTERN.test(baseVersion)) {
    throw new Error(
      `Shared version ${baseVersion} is not a plain release version like 0.1.8.`,
    );
  }

  const eventName = env.GITHUB_EVENT_NAME ?? "";
  const ref = env.GITHUB_REF ?? event.ref ?? "";
  const refName = env.GITHUB_REF_NAME ?? ref.replace(/^refs\/(?:heads|tags)\//u, "");
  const nightlyVersion = createNightlyVersion(baseVersion, env);

  if (ref.startsWith("refs/tags/")) {
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

  if (eventName === "push" && isOfficialRepository(env) && ref === "refs/heads/main") {
    return guardPublish({
      baseVersion,
      distTag: "latest",
      publishVersion: baseVersion,
      shouldPublish: true,
      reason: "trusted main push publishes the clean shared version",
    }, env);
  }

  if (
    eventName === "push" &&
    isOfficialRepository(env) &&
    ref.startsWith("refs/heads/issue-")
  ) {
    return guardPublish({
      baseVersion,
      distTag: "nightly",
      publishVersion: nightlyVersion,
      shouldPublish: true,
      reason: "trusted issue branch push publishes a unique nightly version",
    }, env);
  }

  if (eventName === "pull_request" && isTrustedPullRequest(event, env)) {
    return guardPublish({
      baseVersion,
      distTag: "nightly",
      publishVersion: nightlyVersion,
      shouldPublish: true,
      reason: "trusted pull request publishes a unique nightly version",
    }, env);
  }

  if (eventName === "pull_request" && isForkPullRequest(event)) {
    return {
      baseVersion,
      distTag: "nightly",
      publishVersion: nightlyVersion,
      shouldPublish: false,
      reason: "fork pull request uses dry-run validation only",
    };
  }

  if (eventName === "workflow_dispatch") {
    return {
      baseVersion,
      distTag: "nightly",
      publishVersion: nightlyVersion,
      shouldPublish: false,
      reason: "manual dry-run validation only",
    };
  }

  return {
    baseVersion,
    distTag: "nightly",
    publishVersion: nightlyVersion,
    shouldPublish: false,
    reason: "untrusted or unsupported release event uses dry-run validation only",
  };
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
