import { useEffect, useState } from "react";

import { LocalRepositoryPath } from "./LocalRepositoryPath";
import { GitHubIcon, NpmIcon } from "./icons";
import { WorkflowDemo } from "./WorkflowDemo";

const quickCommand = "npx diagrampilot check";

const proofPoints = [
  {
    signal: "Repo",
    title: "Local",
    text: "Works in a checkout, next to source code.",
  },
  {
    signal: "CLI",
    title: "Checked",
    text: "`diagrampilot check` validates before review.",
  },
  {
    signal: "Error",
    title: "Repairable",
    text: "Failures name the DiagramSpec field to fix.",
  },
  {
    signal: "Tools",
    title: "Authored",
    text: "`diagrampilot create`, `diagrampilot inspect`, `diagrampilot format`, and `diagrampilot watch` stay local.",
  },
  {
    signal: "MCP",
    title: "Agent-ready",
    text: "Add `@diagrampilot/mcp` and run `diagrampilot-mcp` for local agent helpers.",
  },
];

const startingPoints = [
  {
    label: "Workflow",
    href: "/docs/agents/agent-workflow/",
    variant: "primary",
  },
  {
    label: "Install",
    href: "/docs/agents/installation/",
    variant: "primary",
  },
  {
    label: "Demo",
    href: "/docs/agents/quickstart/",
    variant: "secondary",
  },
  {
    label: "MCP",
    href: "/docs/agents/mcp/",
    variant: "secondary",
  },
  {
    label: "npm",
    href: "https://www.npmjs.com/package/diagrampilot",
    variant: "secondary",
    icon: <NpmIcon />,
    ariaLabel: "npm package",
  },
  {
    label: "Docs",
    href: "/docs/",
    variant: "secondary",
  },
  {
    label: "GitHub",
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
              Local diagrams for agents
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
              Source in the repo. SVG out for review.
            </p>
            <div className="hero-actions" aria-label="Primary actions">
              <a className="action action-primary" href="#workflow-proof">
                Workflow
              </a>
              <a className="action action-secondary" href="/docs/agents/installation/">
                Install
              </a>
              <a className="action action-secondary" href="/docs/">
                Docs
              </a>
            </div>
            <QuickCommand />
            <WorkflowSignals />
          </div>

          <WorkflowDemo />
        </section>

        <section className="proof-strip" aria-label="Why DiagramPilot works for agents">
          {proofPoints.map((point) => (
            <article className="proof-item reveal-motion" key={point.title}>
              <p className="proof-signal">{point.signal}</p>
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
          <h2>Start.</h2>
          <p>
            Install the CLI, try the demo, inspect npm, or open GitHub. Public
            docs cover Output Profiles, DiagramSpec, MCP usage, and repairable
            validation errors.
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

function WorkflowSignals() {
  return (
    <dl className="hero-signals" aria-label="DiagramPilot workflow signals">
      <div>
        <dt>.dp.yaml</dt>
        <dd>source</dd>
      </div>
      <div>
        <dt>check</dt>
        <dd>validate</dd>
      </div>
      <div>
        <dt>SVG</dt>
        <dd>review</dd>
      </div>
    </dl>
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
