import type { AuditResult } from "../domain/apiTypes";

interface VerdictPanelProps {
  result: AuditResult;
}

const formatRatio = (ratio?: number) => {
  if (ratio === undefined) return "—";
  return new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2 }).format(ratio);
};

export function VerdictPanel({ result }: VerdictPanelProps) {
  return (
    <section className={`verdict-panel verdict-${result.verdict.toLowerCase().replace("_", "-")}`}>
      <div className="verdict-header">
        <div>
          <p className="eyebrow">Case {result.case_id}</p>
          <h2>{result.verdict.replace("_", " ")}</h2>
        </div>
        <span className="case-status">{result.status}</span>
      </div>
      <p className="verdict-summary">{result.summary}</p>

      {result.contribution ? (
        <div className="metric-grid">
          <div>
            <span>Subject contribution</span>
            <strong>{result.contribution.attributable_value ?? "Unknown"}</strong>
          </div>
          <div>
            <span>Protocol volume</span>
            <strong>{result.contribution.protocol_volume ?? "Unknown"}</strong>
          </div>
          <div>
            <span>Attributable ratio</span>
            <strong>{formatRatio(result.contribution.ratio)}</strong>
          </div>
        </div>
      ) : null}

      {result.protocol_action ? (
        <details className="why-panel" open>
          <summary>Why this conclusion?</summary>
          <div className="protocol-grid">
            <span>Protocol</span><strong>{result.protocol_action.protocol}</strong>
            <span>Action</span><strong>{result.protocol_action.action}</strong>
            <span>Pool</span><strong>{result.protocol_action.pool ?? "Not resolved"}</strong>
            <span>Evidence</span><strong>{result.protocol_action.evidence_ids.join(", ") || "None"}</strong>
          </div>
        </details>
      ) : null}

      {result.warnings.length || result.gaps.length ? (
        <div className="limits-grid">
          <div>
            <h3>Warnings</h3>
            <ul>{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
          </div>
          <div>
            <h3>Evidence gaps</h3>
            <ul>{result.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
