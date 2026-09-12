import type { RequestPhase } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";

interface RunProgressProps {
  phase: RequestPhase;
  locale?: Locale;
}

const stages = ["Validate", "Acquire", "Preserve", "Resolve", "Audit"];

export function RunProgress({ phase, locale = "en" }: RunProgressProps) {
  const completed = phase === "SUCCESS" ? stages.length : 0;

  return (
    <section className="progress-card" aria-live="polite">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Pipeline</p>
          <h2>{locale === "es" ? "Ruta de evidencia" : "Evidence path"}</h2>
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
        {phase === "IDLE" && (locale === "es" ? "Esperando una transacción, un sujeto y una afirmación." : "Waiting for a transaction, a subject and a claim.")}
        {phase === "RUNNING" && (locale === "es" ? "La petición es real. No se sustituyen datos con fixtures." : "The request is live. No fixture or fallback data is being substituted.")}
        {phase === "SUCCESS" && (locale === "es" ? "La API devolvió un resultado rastreable. Revisa cada fuente antes de concluir." : "The API returned a traceable result. Inspect every source before concluding.")}
        {phase === "ERROR" && (locale === "es" ? "La ejecución se detuvo. El error permanece visible." : "The run stopped. The error is visible instead of being replaced with demo data.")}
      </p>
    </section>
  );
}
