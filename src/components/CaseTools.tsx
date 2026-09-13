import { useState, type FormEvent } from "react";
import { Anchor, CheckCircle2, Download, ExternalLink, FileSearch, Link2, Search, UploadCloud, XCircle } from "lucide-react";
import { vector52Client, Vector52ApiError } from "../api/vector52Client";
import type { AnchorCaseResponse, AnchorLookupResponse, CaseEvidenceRecord, CaseRecord, VerifyResponse } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";

const MANIFEST_ROOT_PATTERN = /^0x[0-9a-fA-F]{64}$/;

interface Props {
  locale: Locale;
  initialCaseId?: string | null;
}

const describeError = (error: unknown, locale: Locale) => {
  if (error instanceof Vector52ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return locale === "es" ? "Ocurrió un error inesperado." : "An unexpected error occurred.";
};

const shortHash = (value: string) => (value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value);

function CaseLookupPanel({ locale, initialCaseId }: { locale: Locale; initialCaseId?: string | null }) {
  const [caseId, setCaseId] = useState(initialCaseId ?? "");
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [evidence, setEvidence] = useState<CaseEvidenceRecord[] | null>(null);
  const [anchorResult, setAnchorResult] = useState<AnchorCaseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [anchorError, setAnchorError] = useState<string | null>(null);

  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = caseId.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    setAnchorResult(null);
    setAnchorError(null);
    try {
      const [caseRecord, evidenceRecords] = await Promise.all([
        vector52Client.getCase(trimmed),
        vector52Client.getCaseEvidence(trimmed)
      ]);
      setRecord(caseRecord);
      setEvidence(evidenceRecords);
    } catch (nextError) {
      setRecord(null);
      setEvidence(null);
      setError(describeError(nextError, locale));
    } finally {
      setLoading(false);
    }
  };

  const anchor = async () => {
    if (!record) return;
    setAnchoring(true);
    setAnchorError(null);
    try {
      setAnchorResult(await vector52Client.anchorCase(record.case_id));
    } catch (nextError) {
      setAnchorError(describeError(nextError, locale));
    } finally {
      setAnchoring(false);
    }
  };

  return (
    <article className="case-tool-card">
      <h3><Search size={16} aria-hidden="true" /> {locale === "es" ? "Consultar caso" : "Look up a case"}</h3>
      <p className="case-tool-hint">{locale === "es" ? "Recupera el expediente, su evidencia y ancla su manifiesto en HSK." : "Retrieve the case record, its evidence, and anchor its manifest on HSK."}</p>
      <form className="case-tool-form" onSubmit={(event) => void lookup(event)}>
        <input
          type="text"
          value={caseId}
          onChange={(event) => setCaseId(event.target.value)}
          placeholder={locale === "es" ? "ID de caso" : "Case ID"}
          autoComplete="off"
          spellCheck={false}
        />
        <button type="submit" disabled={loading || !caseId.trim()}>
          {loading ? (locale === "es" ? "Buscando…" : "Looking up…") : (locale === "es" ? "Buscar" : "Look up")}
        </button>
      </form>

      {error ? <p className="case-tool-error" role="alert">{error}</p> : null}

      {record ? (
        <>
          <dl className="case-record-summary">
            <div><dt>{locale === "es" ? "Estado" : "Status"}</dt><dd><span className="case-status">{record.status}</span></dd></div>
            <div><dt>{locale === "es" ? "Veredicto" : "Verdict"}</dt><dd>{record.verdict ?? "UNKNOWN"}</dd></div>
            <div><dt>{locale === "es" ? "Sujeto" : "Subject"}</dt><dd><code title={record.subject}>{shortHash(record.subject)}</code></dd></div>
            <div><dt>Tx</dt><dd><code title={record.transaction_hash}>{shortHash(record.transaction_hash)}</code></dd></div>
            <div><dt>{locale === "es" ? "Actualizado" : "Updated"}</dt><dd>{new Date(record.updated_at).toLocaleString(locale)}</dd></div>
          </dl>

          {evidence?.length ? (
            <div className="case-evidence-list">
              {evidence.map((item) => (
                <div className="case-evidence-row" key={item.evidence_id}>
                  <strong>{item.evidence_id}</strong> · {item.authority_level} · {item.source}
                  <div><span className="case-status">{item.status}</span> {item.block_number ? <span>· {locale === "es" ? "bloque" : "block"} {item.block_number}</span> : null}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-note">{locale === "es" ? "Sin registros de evidencia serializados todavía." : "No serialized evidence records yet."}</p>
          )}

          <div className="case-tool-secondary-actions">
            <a href={vector52Client.casePackageUrl(record.case_id)} download={`${record.case_id}.v52.zip`}>
              <Download size={14} aria-hidden="true" /> {locale === "es" ? "Descargar .v52.zip" : "Download .v52.zip"}
            </a>
            <button type="button" onClick={() => void anchor()} disabled={anchoring}>
              <Anchor size={14} aria-hidden="true" /> {anchoring ? (locale === "es" ? "Anclando…" : "Anchoring…") : (locale === "es" ? "Anclar en HSK" : "Anchor on HSK")}
            </button>
          </div>

          {anchorError ? <p className="case-tool-error" role="alert">{anchorError}</p> : null}

          {anchorResult ? (
            <div className="anchor-result-card">
              <p>
                <CheckCircle2 size={14} aria-hidden="true" />{" "}
                {anchorResult.already_anchored
                  ? (locale === "es" ? "Este manifiesto ya estaba anclado en HSK." : "This manifest was already anchored on HSK.")
                  : (locale === "es" ? "Manifiesto anclado en HSK." : "Manifest anchored on HSK.")}
              </p>
              <p><code title={anchorResult.manifest_root}>{shortHash(anchorResult.manifest_root)}</code></p>
              <a href={anchorResult.explorer_tx_url} target="_blank" rel="noreferrer">
                {locale === "es" ? "Ver transacción" : "View transaction"} <ExternalLink size={13} aria-hidden="true" />
              </a>
            </div>
          ) : null}
        </>
      ) : null}
    </article>
  );
}

function VerifyPackagePanel({ locale }: { locale: Locale }) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await vector52Client.verifyPackage(file));
    } catch (nextError) {
      setError(describeError(nextError, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="case-tool-card">
      <h3><FileSearch size={16} aria-hidden="true" /> {locale === "es" ? "Verificar paquete" : "Verify a package"}</h3>
      <p className="case-tool-hint">{locale === "es" ? "Sube un .v52.zip y confirma que ningún archivo fue alterado desde su emisión." : "Upload a .v52.zip and confirm no file was altered since it was issued."}</p>
      <form className="case-tool-form" onSubmit={(event) => void verify(event)}>
        <input
          type="file"
          accept=".zip"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={loading || !file}>
          <UploadCloud size={14} aria-hidden="true" /> {loading ? (locale === "es" ? "Verificando…" : "Verifying…") : (locale === "es" ? "Verificar" : "Verify")}
        </button>
      </form>

      {error ? <p className="case-tool-error" role="alert">{error}</p> : null}

      {result ? (
        <div className={`verify-result ${result.status === "PASS" ? "is-pass" : "is-fail"}`}>
          <p>
            {result.status === "PASS" ? <CheckCircle2 size={15} aria-hidden="true" /> : <XCircle size={15} aria-hidden="true" />}{" "}
            <strong>{result.status}</strong> · {result.checked_files} {locale === "es" ? "archivos verificados" : "files checked"}
          </p>
          {result.errors.length ? (
            <ul className="inline-warnings">
              {result.errors.map((issue) => <li key={issue.file}>{issue.file}: {issue.reason}</li>)}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function AnchorLookupPanel({ locale }: { locale: Locale }) {
  const [manifestRoot, setManifestRoot] = useState("");
  const [record, setRecord] = useState<AnchorLookupResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalid = manifestRoot.trim().length > 0 && !MANIFEST_ROOT_PATTERN.test(manifestRoot.trim());

  const lookup = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = manifestRoot.trim();
    if (!MANIFEST_ROOT_PATTERN.test(trimmed)) return;
    setLoading(true);
    setError(null);
    setRecord(null);
    try {
      setRecord(await vector52Client.getAnchor(trimmed));
    } catch (nextError) {
      setError(describeError(nextError, locale));
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="case-tool-card">
      <h3><Link2 size={16} aria-hidden="true" /> {locale === "es" ? "Consultar anclaje HSK" : "Look up an HSK anchor"}</h3>
      <p className="case-tool-hint">{locale === "es" ? "Cualquiera puede verificar públicamente que un manifest_root existe on-chain." : "Anyone can publicly verify that a manifest_root exists on-chain."}</p>
      <form className="case-tool-form" onSubmit={(event) => void lookup(event)}>
        <input
          type="text"
          value={manifestRoot}
          onChange={(event) => setManifestRoot(event.target.value)}
          placeholder="0x…"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid}
        />
        <button type="submit" disabled={loading || !MANIFEST_ROOT_PATTERN.test(manifestRoot.trim())}>
          {loading ? (locale === "es" ? "Consultando…" : "Looking up…") : (locale === "es" ? "Consultar" : "Look up")}
        </button>
      </form>
      {invalid ? (
        <small className="field-error">{locale === "es" ? "Debe ser 0x + 64 caracteres hexadecimales." : "Must be 0x followed by 64 hexadecimal characters."}</small>
      ) : null}

      {error ? <p className="case-tool-error" role="alert">{error}</p> : null}

      {record ? (
        <div className="anchor-result-card">
          <dl className="case-record-summary">
            <div><dt>{locale === "es" ? "Caso" : "Case"}</dt><dd>{record.case_id}</dd></div>
            <div><dt>{locale === "es" ? "Emisor" : "Issuer"}</dt><dd><code title={record.issuer}>{shortHash(record.issuer)}</code></dd></div>
            <div><dt>{locale === "es" ? "Bloque" : "Block"}</dt><dd>{record.block_number}</dd></div>
            <div><dt>{locale === "es" ? "Versión de esquema" : "Schema version"}</dt><dd>{record.schema_version}</dd></div>
          </dl>
          {record.explorer_tx_url ? (
            <a href={record.explorer_tx_url} target="_blank" rel="noreferrer">
              {locale === "es" ? "Ver transacción" : "View transaction"} <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : (
            <a href={record.explorer_address_url} target="_blank" rel="noreferrer">
              {locale === "es" ? "Ver contrato" : "View contract"} <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function CaseTools({ locale, initialCaseId }: Props) {
  return (
    <section className="result-section case-tools" aria-label={locale === "es" ? "Casos y verificación" : "Cases and verification"}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">{locale === "es" ? "Casos y verificación" : "Cases and verification"}</p>
          <h2>{locale === "es" ? "Consulta, verifica y ancla la evidencia" : "Look up, verify, and anchor the evidence"}</h2>
        </div>
      </div>
      <div className="case-tools-grid">
        <CaseLookupPanel locale={locale} initialCaseId={initialCaseId} />
        <VerifyPackagePanel locale={locale} />
        <AnchorLookupPanel locale={locale} />
      </div>
    </section>
  );
}
