import type { EvidenceItem } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";

interface EvidenceInspectorProps {
  supporting: EvidenceItem[];
  opposing: EvidenceItem[];
  locale?: Locale;
}

function EvidenceCard({ evidence, tone, locale }: { evidence: EvidenceItem; tone: "for" | "against"; locale: Locale }) {
  return (
    <article className={`evidence-item evidence-${tone}`}>
      <div className="evidence-topline">
        <span className="evidence-id">{evidence.evidence_id}</span>
        <span className="authority-chip">{evidence.authority_level}</span>
      </div>
      <h3>{locale === "es" ? `Evidencia de ${evidence.source}` : `${evidence.source} evidence`}</h3>
      <dl className="evidence-metadata">
        <div>
          <dt>{locale === "es" ? "Fuente" : "Source"}</dt>
          <dd>{evidence.source}</dd>
        </div>
        <div>
          <dt>{locale === "es" ? "Estado" : "Status"}</dt>
          <dd>{evidence.status}</dd>
        </div>
        {evidence.block_number ? (
          <div>
            <dt>{locale === "es" ? "Bloque" : "Block"}</dt>
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

export function EvidenceInspector({ supporting, opposing, locale = "en" }: EvidenceInspectorProps) {
  return (
    <section className="result-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{locale === "es" ? "Inspector de evidencia" : "Evidence inspector"}</p>
          <h2>{locale === "es" ? "Rastrea la conclusión hasta su fuente" : "Trace the conclusion to its source"}</h2>
        </div>
        <span className="count-chip">{supporting.length + opposing.length} {locale === "es" ? "registros" : "records"}</span>
      </div>

      <div className="evidence-columns">
        <div>
          <h3 className="column-title">{locale === "es" ? "Evidencia favorable" : "Evidence for"}</h3>
          {supporting.length ? (
            supporting.map((item) => <EvidenceCard evidence={item} key={item.evidence_id} tone="for" locale={locale} />)
          ) : (
            <p className="empty-note">{locale === "es" ? "No se devolvió evidencia favorable." : "No supporting evidence was returned."}</p>
          )}
        </div>
        <div>
          <h3 className="column-title">{locale === "es" ? "Contraevidencia" : "Counterevidence"}</h3>
          {opposing.length ? (
            opposing.map((item) => <EvidenceCard evidence={item} key={item.evidence_id} tone="against" locale={locale} />)
          ) : (
            <p className="empty-note">{locale === "es" ? "No se devolvió contraevidencia." : "No counterevidence was returned."}</p>
          )}
        </div>
      </div>
    </section>
  );
}
