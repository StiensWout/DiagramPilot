import { useEffect, useState } from "react";

import { LocalRepositoryPath } from "./LocalRepositoryPath";
import { GitHubIcon, NpmIcon } from "./icons";
import { WorkflowDemo } from "./WorkflowDemo";

const quickCommand = "npx diagrampilot check";

const proofPoints = [
  {
    title: "Bring your own repository.",
    text: "DiagramPilot works where agents already work: in a checkout, next to source code, with artifacts a maintainer can review.",
  },
  {
    title: "One command before review.",
    text: "`diagrampilot check` discovers DiagramPilot source files, validates them, and reports stale same-stem SVG artifacts without rewriting the working tree.",
  },
  {
    title: "If it breaks, it says where.",
    text: "Repairable errors name the broken field so an AI coding agent can update the DiagramSpec file, validate again, and commit the repaired source plus rendered output.",
  },
  {
    title: "Author with local tools.",
    text: "`diagrampilot create`, `diagrampilot inspect`, `diagrampilot format`, and `diagrampilot watch` cover starter sources, read-only inventory, canonical YAML, and checked generation loops.",
  },
  {
    title: "MCP agent integration.",
    text: "Add `@diagrampilot/mcp` and run `diagrampilot-mcp` to expose schema, docs, examples, validation, check, export, render, and prompt helpers to local MCP clients.",
  },
];

const startingPoints = [
  {
    label: "Agent Workflow",
    href: "/docs/agents/agent-workflow/",
    variant: "primary",
  },
  {
    label: "Install Guide",
    href: "/docs/agents/installation/",
    variant: "primary",
  },
  {
    label: "Checkout Demo Project",
    href: "/docs/agents/quickstart/",
    variant: "secondary",
  },
  {
    label: "MCP Guide",
    href: "/docs/agents/mcp/",
    variant: "secondary",
  },
  {
    label: "npm package",
    href: "https://www.npmjs.com/package/diagrampilot",
    variant: "secondary",
    icon: <NpmIcon />,
    ariaLabel: "npm package",
  },
  {
    label: "Documentation",
    href: "/docs/",
    variant: "secondary",
  },
  {
    label: "GitHub repository",
    href: "https://github.com/StiensWout/DiagramPilot",
    variant: "secondary",
    icon: <GitHubIcon />,
    ariaLabel: "GitHub repository",
  },
];

export function LandingPage() {
  useLandingReveal();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>

      <main id="main">
        <section className="hero-zone" aria-labelledby="landing-title">
          <div className="hero-copy motion-rise">
            <p className="hero-eyebrow">
              Repo-native diagram compiler for AI coding agents
            </p>
            <h1 id="landing-title" className="sr-only">
              DiagramPilot
            </h1>
            <img
              className="hero-wordmark"
              src="/brand/diagrampilot-logo-light.svg"
              alt=""
              width="720"
              height="160"
              decoding="async"
            />
            <p className="promise">
              Commit diagrams like code: `.dp.yaml` source in the repo, local
              checks before review, and SVG artifacts maintainers can inspect.
            </p>
            <div className="hero-actions" aria-label="Primary actions">
              <a className="action action-primary" href="#workflow-proof">
                See the workflow
              </a>
              <a className="action action-secondary" href="/docs/agents/installation/">
                Install Guide
              </a>
              <a className="action action-secondary" href="/docs/">
                Read Docs
              </a>
            </div>
            <QuickCommand />
          </div>

          <WorkflowDemo />
        </section>

        <section className="intro-copy reveal-motion" aria-label="Product summary">
          <p>
            DiagramPilot is a local-first, repo-native diagram compiler for AI
            coding agents. It turns local DiagramSpec files into review-stable SVG
            artifacts for software repositories, so diagrams can live in the repo,
            survive code review, and fail with repairable errors.
          </p>
        </section>

        <section className="proof-strip" aria-label="Why DiagramPilot works for agents">
          {proofPoints.map((point) => (
            <article className="proof-item reveal-motion" key={point.title}>
              <h2>{point.title}</h2>
              <p>{point.text}</p>
            </article>
          ))}
        </section>

        <LocalRepositoryPath />

        <section
          className="final-cta reveal-motion"
          aria-label="DiagramPilot starting points"
        >
          <h2>Starting points.</h2>
          <p>
            Install the CLI, try the checkout demo, inspect the npm package, or
            open the repository before adding DiagramPilot to your agent workflow.
            Public docs cover Output Profiles, DiagramSpec, MCP usage, and
            repairable validation errors.
          </p>
          <div className="hero-actions">
            {startingPoints.map((point) => (
              <a
                className={`action action-${point.variant}`}
                href={point.href}
                key={point.href}
                aria-label={point.ariaLabel}
              >
                {point.icon}
                <span>{point.label}</span>
              </a>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function QuickCommand() {
  const [copyLabel, setCopyLabel] = useState("Copy");

  async function copyCommand() {
    if (!navigator.clipboard) return;

    await navigator.clipboard.writeText(quickCommand);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy"), 1600);
  }

  return (
    <div className="quick-command" aria-label="Quick command">
      <code>{quickCommand}</code>
      <button
        type="button"
        className="command-copy"
        data-copy-command={quickCommand}
        aria-label="Copy npx diagrampilot check"
        onClick={copyCommand}
      >
        {copyLabel}
      </button>
    </div>
  );
}

function useLandingReveal() {
  useEffect(() => {
    const revealElements = document.querySelectorAll(".reveal-motion");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    document.body.classList.add("motion-ready");

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealElements.forEach((element) => element.classList.add("is-visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.16 },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);
}
