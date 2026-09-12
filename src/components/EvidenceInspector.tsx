import type { EvidenceItem } from "../domain/apiTypes";

interface EvidenceInspectorProps {
  supporting: EvidenceItem[];
  opposing: EvidenceItem[];
}

function EvidenceCard({ evidence, tone }: { evidence: EvidenceItem; tone: "for" | "against" }) {
  return (
    <article className={`evidence-item evidence-${tone}`}>
      <div className="evidence-topline">
        <span className="evidence-id">{evidence.evidence_id}</span>
        <span className="authority-chip">{evidence.authority_level}</span>
      </div>
      <h3>{evidence.summary ?? `${evidence.source} evidence`}</h3>
      <dl className="evidence-metadata">
        <div>
          <dt>Source</dt>
          <dd>{evidence.source}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{evidence.status}</dd>
        </div>
        {evidence.block_number ? (
          <div>
            <dt>Block</dt>
            <dd>{evidence.block_number}</dd>
          </div>
        ) : null}
        {evidence.raw_sha256 ? (
          <div className="hash-row">
            <dt>SHA-256</dt>
            <dd title={evidence.raw_sha256}>{evidence.raw_sha256}</dd>
          </div>
        ) : null}
      </dl>
      {evidence.warnings?.length ? (
        <ul className="inline-warnings">
          {evidence.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}

export function EvidenceInspector({ supporting, opposing }: EvidenceInspectorProps) {
  return (
    <section className="result-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Evidence inspector</p>
          <h2>Trace the conclusion to its source</h2>
        </div>
        <span className="count-chip">{supporting.length + opposing.length} records</span>
      </div>

      <div className="evidence-columns">
        <div>
          <h3 className="column-title">Evidence for</h3>
          {supporting.length ? (
            supporting.map((item) => <EvidenceCard evidence={item} key={item.evidence_id} tone="for" />)
          ) : (
            <p className="empty-note">No supporting evidence was returned.</p>
          )}
        </div>
        <div>
          <h3 className="column-title">Counterevidence</h3>
          {opposing.length ? (
            opposing.map((item) => <EvidenceCard evidence={item} key={item.evidence_id} tone="against" />)
          ) : (
            <p className="empty-note">No counterevidence was returned.</p>
          )}
        </div>
      </div>
    </section>
  );
}
