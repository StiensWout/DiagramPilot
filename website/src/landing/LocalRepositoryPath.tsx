export function LocalRepositoryPath() {
  return (
    <section className="image-band reveal-motion" aria-labelledby="artifact-title">
      <div className="repo-path-layout">
        <div className="section-copy">
          <p className="eyebrow">Local repository path</p>
          <h2 id="artifact-title">Source files become reviewable artifacts.</h2>
          <p>
            Keep DiagramSpec source beside rendered output. Agents can validate
            changes locally before a maintainer reviews the commit.
          </p>
        </div>

        <div
          className="repo-path-animation"
          aria-label="Local repository path from source file through check to SVG artifact"
        >
          <div className="path-rail" aria-hidden="true">
            <span className="path-progress" />
          </div>
          <ol>
            <li data-path-step>
              <span className="path-node">repo checkout</span>
              <code>demo-projects/checkout</code>
            </li>
            <li data-path-step>
              <span className="path-node">source</span>
              <code>docs/architecture.dp.yaml</code>
            </li>
            <li data-path-step>
              <span className="path-node">check</span>
              <code>npx diagrampilot check</code>
            </li>
            <li data-path-step>
              <span className="path-node">artifact</span>
              <code>docs/architecture.svg</code>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
