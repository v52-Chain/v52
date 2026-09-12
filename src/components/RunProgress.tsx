import type { RequestPhase } from "../domain/apiTypes";

interface RunProgressProps {
  phase: RequestPhase;
}

const stages = ["Validate", "Acquire", "Preserve", "Resolve", "Audit"];

export function RunProgress({ phase }: RunProgressProps) {
  const completed = phase === "SUCCESS" ? stages.length : 0;

  return (
    <section className="progress-card" aria-live="polite">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2>Evidence path</h2>
        </div>
        <span className={`phase-badge phase-${phase.toLowerCase()}`}>{phase}</span>
      </div>

      <ol className="pipeline-list">
        {stages.map((stage, index) => {
          const isComplete = index < completed;
          const isRunning = phase === "RUNNING" && index === 0;
          return (
            <li className={isComplete ? "is-complete" : isRunning ? "is-running" : ""} key={stage}>
              <span className="stage-index">{isComplete ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <span>{stage}</span>
            </li>
          );
        })}
      </ol>

      <p className="progress-note">
        {phase === "IDLE" && "Waiting for a transaction and a claim."}
        {phase === "RUNNING" && "The request is live. No fixture or fallback data is being substituted."}
        {phase === "SUCCESS" && "The API returned a traceable result. Inspect every source before concluding."}
        {phase === "ERROR" && "The run stopped. The error is visible instead of being replaced with demo data."}
      </p>
    </section>
  );
}
