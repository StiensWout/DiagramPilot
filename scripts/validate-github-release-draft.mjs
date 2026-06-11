#!/usr/bin/env node

import { readFileSync } from "node:fs";
import path from "node:path";

function parseArgs(args) {
  const parsed = {
    draftJsonPath: "",
    version: "",
    tag: "",
  };
  const optionTargets = {
    "--draft-json": "draftJsonPath",
    "--version": "version",
    "--tag": "tag",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const parsedOption = parseOption(arg, args[index + 1], optionTargets);

    if (parsedOption !== undefined) {
      parsed[parsedOption.target] = parsedOption.value;
      index += 1;
      continue;
    }

    throw new Error(
      "Usage: node scripts/validate-github-release-draft.mjs --draft-json <path> --version <version> [--tag <tag>]",
    );
  }

  requireParsedArgs(parsed);

  return {
    ...parsed,
    tag: parsed.tag === "" ? `v${parsed.version}` : parsed.tag,
  };
}

function parseOption(arg, value, optionTargets) {
  const target = optionTargets[arg];

  return target === undefined ? undefined : { target, value: value ?? "" };
}

function requireParsedArgs(parsed) {
  if (parsed.draftJsonPath === "" || parsed.version === "") {
    throw new Error(
      "Usage: node scripts/validate-github-release-draft.mjs --draft-json <path> --version <version> [--tag <tag>]",
    );
  }
}

function readDraftJson(pathValue) {
  return JSON.parse(readFileSync(path.resolve(pathValue), "utf8"));
}

function requireDraft(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateDraft({ draft, version, tag }) {
  const body = typeof draft.body === "string" ? draft.body : "";
  const name = typeof draft.name === "string" ? draft.name : "";

  requireDraft(tag === `v${version}`, `release tag ${tag} does not match version ${version}`);
  requireDraft(draft.tagName === tag, `draft tag ${draft.tagName ?? "missing"} does not match ${tag}`);
  requireDraft(draft.isDraft === true, `release ${tag} must still be a reviewed draft`);
  requireDraft(draft.isPrerelease !== true, `release ${tag} must not be marked as a prerelease`);
  requireDraft(name.includes(tag), `draft name must include ${tag}`);
  requireDraft(body.trim() !== "", `draft body is empty for ${tag}`);
  requireDraft(body.includes(`# DiagramPilot ${tag}`), `draft body must include # DiagramPilot ${tag}`);
  requireDraft(body.includes(`Release Version: ${version}`), `draft body must include Release Version: ${version}`);
  requireDraft(body.includes(`Tag: ${tag}`), `draft body must include Tag: ${tag}`);
  requireDraft(body.includes("## Highlights"), "draft body must include Highlights");
  requireDraft(body.includes("## What's Changed"), "draft body must include What's Changed");
  requireDraft(body.includes("## Breaking Changes"), "draft body must include Breaking Changes");
  requireDraft(body.includes("## Upgrade Notes"), "draft body must include Upgrade Notes");
  requireDraft(body.includes("## Packages"), "draft body must include Packages");
  requireDraft(body.includes("## Full Changelog"), "draft body must include Full Changelog");
}

function main() {
  const { draftJsonPath, version, tag } = parseArgs(process.argv.slice(2));
  const draft = readDraftJson(draftJsonPath);

  validateDraft({ draft, version, tag });
  process.stdout.write(`GitHub Release draft ${tag} is ready for publication.\n`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Unable to validate GitHub Release draft: ${message}\n`);
  process.exitCode = 1;
}
