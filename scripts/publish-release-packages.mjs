#!/usr/bin/env node

import { spawnSync } from "node:child_process";

import { PUBLIC_PACKAGE_NAMES } from "./public-package-set.mjs";

function requiredEnv(name) {
  const value = process.env[name];

  if (value !== undefined && value !== "") {
    return value;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

function runNpm(args, { env = process.env, print = false } = {}) {
  const result = spawnSync("npm", args, {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";

  if (print) {
    process.stdout.write(stdout);
    process.stderr.write(stderr);
  }

  return {
    ...result,
    stdout,
    stderr,
    output: `${stdout}${stderr}`,
  };
}

function packageVersionExists(packageName, version) {
  return runNpm([
    "view",
    `${packageName}@${version}`,
    "version",
    "--silent",
  ]).status === 0;
}

function currentDistTagVersion(packageName, distTag) {
  const result = runNpm([
    "view",
    packageName,
    `dist-tags.${distTag}`,
    "--silent",
  ]);

  return result.status === 0 ? result.stdout.trim() : "";
}

function latestPackageSetAlreadyPublished() {
  return runNpm([
    "run",
    "check:package-publish-state",
    "--",
    "--expect",
    "latest",
  ]).status === 0;
}

function ensureDistTag(packageName, version, distTag) {
  const currentTag = currentDistTagVersion(packageName, distTag);

  if (currentTag === version) {
    console.log(`${packageName}@${version} already publishes under ${distTag}; skipping npm publish.`);
    return;
  }

  const result = runNpm([
    "dist-tag",
    "add",
    `${packageName}@${version}`,
    distTag,
  ], { print: true });

  if (result.status !== 0) {
    throw new Error(
      `Unable to add ${distTag} dist-tag for ${packageName}@${version}.`,
    );
  }
}

function publishArgs(packageName, version, distTag, mode) {
  return [
    "publish",
    "--workspace",
    packageName,
    "--tag",
    distTag,
    "--access",
    "public",
    ...(mode === "dry-run" ? ["--dry-run"] : []),
  ];
}

function isTransparencyLogCollision(result) {
  return (
    /\bTLOG_CREATE_ENTRY_ERROR\b/u.test(result.output) &&
    /equivalent entry already exists in the transparency log/u.test(result.output)
  );
}

function retryNightlyWithoutProvenance(packageName, version, distTag, mode) {
  console.error(
    `Retrying ${packageName}@${version} without npm provenance after transparency-log collision.`,
  );

  const result = runNpm(
    publishArgs(packageName, version, distTag, mode),
    {
      env: {
        ...process.env,
        NPM_CONFIG_PROVENANCE: "false",
      },
      print: true,
    },
  );

  if (result.status !== 0) {
    throw new Error(
      `Unable to publish ${packageName}@${version} after provenance fallback.`,
    );
  }
}

function existingPackageHandled({ packageName, version, distTag, mode }) {
  if (!packageVersionExists(packageName, version)) {
    return false;
  }

  if (mode === "dry-run") {
    console.log(`${packageName}@${version} already exists; skipping npm publish dry-run.`);
    return true;
  }

  ensureDistTag(packageName, version, distTag);
  return true;
}

function canRetryWithoutProvenance({ mode, distTag, result }) {
  return mode === "publish" && distTag === "nightly" && isTransparencyLogCollision(result);
}

function handlePublishFailure(context, result) {
  const { packageName, version, distTag, mode } = context;

  if (!canRetryWithoutProvenance({ mode, distTag, result })) {
    throw new Error(`Unable to publish ${packageName}@${version}.`);
  }

  if (packageVersionExists(packageName, version)) {
    ensureDistTag(packageName, version, distTag);
    return;
  }

  retryNightlyWithoutProvenance(packageName, version, distTag, mode);
}

function publishPackage(packageName, version, distTag, mode) {
  const context = { packageName, version, distTag, mode };

  if (existingPackageHandled(context)) {
    return;
  }

  const result = runNpm(
    publishArgs(packageName, version, distTag, mode),
    { print: true },
  );

  if (result.status !== 0) {
    handlePublishFailure(context, result);
  }
}

function parseMode(args) {
  const modeIndex = args.indexOf("--mode");

  if (modeIndex === -1) {
    return "publish";
  }

  const mode = args[modeIndex + 1];
  if (mode === "dry-run" || mode === "publish") {
    return mode;
  }

  throw new Error("Usage: node scripts/publish-release-packages.mjs [--mode dry-run|publish]");
}

function releaseContext(args) {
  return {
    mode: parseMode(args),
    version: requiredEnv("RELEASE_PUBLISH_VERSION"),
    distTag: requiredEnv("RELEASE_DIST_TAG"),
  };
}

function latestPackageSetHandled({ version, distTag, mode }) {
  if (distTag !== "latest" || !latestPackageSetAlreadyPublished()) {
    return false;
  }

  console.log(
    `Public Package Set already publishes ${version} under latest; skipping npm publish${mode === "dry-run" ? " dry-run" : ""}.`,
  );
  return true;
}

function publishPackages({ mode, version, distTag }) {
  for (const packageName of PUBLIC_PACKAGE_NAMES) {
    publishPackage(packageName, version, distTag, mode);
  }
}

function main() {
  const context = releaseContext(process.argv.slice(2));

  if (!latestPackageSetHandled(context)) {
    publishPackages(context);
  }
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to publish DiagramPilot packages: ${message}\n`);
  process.exitCode = 1;
}
