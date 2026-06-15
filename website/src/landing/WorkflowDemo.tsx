import { useEffect, useMemo, useState } from "react";

const workflowSteps = [
  {
    id: "source",
    label: "Source",
    detail: "docs/architecture.dp.yaml",
    status: "Source sits beside the code.",
  },
  {
    id: "check",
    label: "Check",
    detail: "npx diagrampilot check",
    status: "Validation runs without rewriting the tree.",
  },
  {
    id: "generate",
    label: "Generate",
    detail: "npx diagrampilot generate",
    status: "Artifacts refresh from source.",
  },
  {
    id: "svg",
    label: "SVG",
    detail: "docs/architecture.svg",
    status: "Output is ready for code review.",
  },
] as const;

type WorkflowStepId = (typeof workflowSteps)[number]["id"];

const stepStatuses = new Map(
  workflowSteps.map((step) => [step.id, step.status] as const),
);

export function WorkflowDemo() {
  const [activeStep, setActiveStep] = useState<WorkflowStepId>("source");
  const [isAutomatic, setIsAutomatic] = useState(true);
  const steps = useMemo(() => workflowSteps.map((step) => step.id), []);

  useEffect(() => {
    if (!isAutomatic) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      setActiveStep((current) => {
        const index = steps.indexOf(current);
        return steps[(index + 1) % steps.length];
      });
    }, 2800);

    return () => window.clearInterval(timer);
  }, [isAutomatic, steps]);

  return (
    <div
      id="workflow-proof"
      className="workflow-proof motion-rise motion-delay-1"
      aria-labelledby="workflow-proof-title"
      aria-label="Interactive DiagramPilot workflow proof"
    >
      <div className="workflow-heading">
        <p className="eyebrow">Workflow</p>
        <h2 id="workflow-proof-title">Source to SVG.</h2>
        <p>One checkout. One reviewable artifact.</p>
      </div>

      <div className="demo-stage" data-demo-stage data-active-step={activeStep}>
        <ol className="demo-steps" aria-label="DiagramPilot workflow stages">
          {workflowSteps.map((step, index) => (
            <li key={step.id}>
              <button
                type="button"
                className="demo-step"
                data-demo-control={step.id}
                aria-pressed={activeStep === step.id}
                onClick={() => {
                  setIsAutomatic(false);
                  setActiveStep(step.id);
                }}
              >
                <span className="demo-step-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong>{step.label}</strong>
                  <code>{step.detail}</code>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <p className="demo-status" data-demo-status aria-live="polite">
          {stepStatuses.get(activeStep)}
        </p>

        <div
          className="demo-workspace"
          aria-label="DiagramPilot source, terminal output, and SVG artifact"
        >
          <SourcePane />
          <TerminalPane />
          <OutputPane />
        </div>
      </div>
    </div>
  );
}

function SourcePane() {
  return (
    <div
      className="demo-pane demo-source"
      data-demo-highlight="source"
      aria-labelledby="demo-source-title"
    >
      <div className="demo-pane-header">
        <span id="demo-source-title">docs/architecture.dp.yaml</span>
        <span>source</span>
      </div>
      <pre>
        <code>{`version: 1
id: checkout_architecture
title: Checkout service architecture
objects:
  - id: web_app
    label: Web app
    kind: service
  - id: checkout_api
    label: Checkout API
    kind: service
edges:
  - id: submit_order
    from: web_app
    to: checkout_api`}</code>
      </pre>
    </div>
  );
}

function TerminalPane() {
  return (
    <div className="demo-pane demo-terminal" aria-labelledby="demo-terminal-title">
      <div className="demo-pane-header">
        <span id="demo-terminal-title">Terminal</span>
        <span>local</span>
      </div>
      <pre>
        <code>
          <span data-demo-highlight="check">{`$ npx diagrampilot check
ok 1 DiagramPilot Source File
ok docs/architecture.svg is fresh`}</span>

          <span data-demo-highlight="generate">{`$ npx diagrampilot generate
ok wrote docs/architecture.svg
ok wrote docs/architecture.md`}</span>
        </code>
      </pre>
    </div>
  );
}

function OutputPane() {
  return (
    <div
      className="demo-pane demo-output"
      data-demo-highlight="svg"
      aria-labelledby="demo-output-title"
    >
      <div className="demo-pane-header">
        <span id="demo-output-title">SVG artifact</span>
        <span>architecture.svg</span>
      </div>
      <svg
        className="demo-svg"
        viewBox="0 0 640 360"
        role="img"
        aria-labelledby="demo-svg-title demo-svg-description"
      >
        <title id="demo-svg-title">Review-stable SVG artifact</title>
        <desc id="demo-svg-description">
          A DiagramPilot architecture SVG showing web, checkout, payment, queue,
          worker, and database components with labeled data flow.
        </desc>
        <defs>
          <marker
            id="artifact-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path className="artifact-arrow-head" d="M0 0L10 5L0 10Z" />
          </marker>
        </defs>
        <rect className="artifact-canvas" x="0" y="0" width="640" height="360" rx="12" />
        <g className="artifact-group">
          <rect x="28" y="32" width="584" height="270" rx="14" />
          <text x="52" y="62">
            demo-projects/checkout
          </text>
        </g>
        <g className="artifact-node artifact-node-source">
          <rect x="70" y="105" width="132" height="72" rx="10" />
          <text x="136" y="134" textAnchor="middle">
            web app
          </text>
          <text x="136" y="156" textAnchor="middle">
            source checkout
          </text>
        </g>
        <g className="artifact-node artifact-node-service">
          <rect x="254" y="92" width="132" height="72" rx="10" />
          <text x="320" y="121" textAnchor="middle">
            checkout API
          </text>
          <text x="320" y="143" textAnchor="middle">
            validates order
          </text>
        </g>
        <g className="artifact-node artifact-node-external">
          <rect x="438" y="105" width="132" height="72" rx="10" />
          <text x="504" y="134" textAnchor="middle">
            payment provider
          </text>
          <text x="504" y="156" textAnchor="middle">
            authorize card
          </text>
        </g>
        <g className="artifact-node artifact-node-queue">
          <rect x="254" y="214" width="132" height="64" rx="10" />
          <text x="320" y="242" textAnchor="middle">
            order queue
          </text>
          <text x="320" y="263" textAnchor="middle">
            async receipt
          </text>
        </g>
        <g className="artifact-node artifact-node-data">
          <rect x="70" y="220" width="132" height="58" rx="10" />
          <text x="136" y="245" textAnchor="middle">
            orders DB
          </text>
          <text x="136" y="265" textAnchor="middle">
            persist state
          </text>
        </g>
        <g className="artifact-node artifact-node-worker">
          <rect x="438" y="220" width="132" height="58" rx="10" />
          <text x="504" y="245" textAnchor="middle">
            worker
          </text>
          <text x="504" y="265" textAnchor="middle">
            send receipt
          </text>
        </g>
        <path className="artifact-edge artifact-edge-primary" d="M202 141H254" />
        <path className="artifact-edge artifact-edge-primary" d="M386 141H438" />
        <path className="artifact-edge" d="M320 164V214" />
        <path className="artifact-edge" d="M254 246H202" />
        <path className="artifact-edge" d="M386 246H438" />
        <text className="artifact-label" x="228" y="130" textAnchor="middle">
          submit
        </text>
        <text className="artifact-label" x="412" y="130" textAnchor="middle">
          authorize
        </text>
        <text className="artifact-label" x="346" y="192" textAnchor="middle">
          publish
        </text>
        <text className="artifact-caption" x="320" y="326" textAnchor="middle">
          rendered from docs/architecture.dp.yaml for code review
        </text>
      </svg>
    </div>
  );
}
