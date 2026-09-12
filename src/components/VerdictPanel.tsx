import type { AuditResult } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";

interface VerdictPanelProps {
  result: AuditResult;
  locale?: Locale;
}

export function VerdictPanel({ result, locale = "en" }: VerdictPanelProps) {
  const verdict = result.verdict ?? "UNKNOWN";
  const swap = result.protocol_action?.swap;
  return (
    <section className={`verdict-panel verdict-${verdict.toLowerCase().replace("_", "-")}`}>
      <div className="verdict-header">
        <div>
          <p className="eyebrow">{locale === "es" ? "Caso" : "Case"} {result.case_id}</p>
          <h2>{verdict.replace("_", " ")}</h2>
        </div>
        <span className="case-status">{result.status}</span>
      </div>
      <p className="verdict-summary">{result.summary}</p>

      {result.contribution ? (
        <div className="metric-grid">
          <div>
            <span>{locale === "es" ? "Entrada atribuible" : "Attributable input"}</span>
            <strong>{result.contribution.amount_in_raw ?? "UNKNOWN"} {result.contribution.token_in_symbol ?? ""}</strong>
          </div>
          <div>
            <span>{locale === "es" ? "Salida atribuible" : "Attributable output"}</span>
            <strong>{result.contribution.amount_out_raw ?? "UNKNOWN"} {result.contribution.token_out_symbol ?? ""}</strong>
          </div>
          <div>
            <span>{locale === "es" ? "% del volumen" : "% of pool volume"}</span>
            <strong>{result.contribution.percentage_of_pool_volume ?? "UNKNOWN"}</strong>
          </div>
        </div>
      ) : null}

      {result.protocol_action ? (
        <details className="why-panel" open>
          <summary>{locale === "es" ? "¿Por qué esta conclusión?" : "Why this conclusion?"}</summary>
          <div className="protocol-grid">
            <span>{locale === "es" ? "Protocolo" : "Protocol"}</span><strong>{result.protocol_action.protocol}</strong>
            <span>{locale === "es" ? "Acción" : "Action"}</span><strong>{result.protocol_action.action}</strong>
            <span>Pool</span><strong>{swap?.pool_address ?? (locale === "es" ? "No resuelto" : "Not resolved")}</strong>
            <span>{locale === "es" ? "Evidencia" : "Evidence"}</span><strong>{swap?.evidence_ids.join(", ") || "UNKNOWN"}</strong>
          </div>
        </details>
      ) : null}

      {result.warnings.length || result.gaps.length ? (
        <div className="limits-grid">
          <div>
            <h3>{locale === "es" ? "Advertencias" : "Warnings"}</h3>
            <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
          <div>
            <h3>{locale === "es" ? "Vacíos de evidencia" : "Evidence gaps"}</h3>
            <ul>{result.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
