import { useState, type FormEvent } from "react";
import type { ClaimAuditRequest } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import {
  toClaimAuditRequest,
  validateAuditForm,
  type AuditFormErrors,
  type AuditFormValues
} from "../domain/validation";

interface AuditFormProps {
  disabled?: boolean;
  locale?: Locale;
  onSubmit: (request: ClaimAuditRequest) => void | Promise<void>;
}

const initialValues: AuditFormValues = {
  transactionHash: "",
  claim: "",
  subject: "",
  useAi: false
};

export function AuditForm({ disabled = false, locale = "en", onSubmit }: AuditFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<AuditFormErrors>({});

  const update = <K extends keyof AuditFormValues>(key: K, value: AuditFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAuditForm(values, locale);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    void onSubmit(toClaimAuditRequest(values));
  };

  return (
    <form className="audit-form" onSubmit={handleSubmit} noValidate>
      <div className="form-heading">
        <div>
          <p className="eyebrow">{locale === "es" ? "Nueva auditoría" : "New audit"}</p>
          <h2>{locale === "es" ? "Cuestiona una afirmación onchain" : "Challenge an onchain claim"}</h2>
        </div>
        <span className="network-chip">Ethereum · Mainnet</span>
      </div>

      <label className="field" htmlFor="transaction-hash">
        <span>{locale === "es" ? "Hash de transacción" : "Transaction hash"}</span>
        <input
          id="transaction-hash"
          name="transactionHash"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x…"
          value={values.transactionHash}
          disabled={disabled}
          aria-invalid={Boolean(errors.transactionHash)}
          aria-describedby={errors.transactionHash ? "transaction-error" : "transaction-help"}
          onChange={(event) => update("transactionHash", event.target.value)}
        />
        <small id="transaction-help">{locale === "es" ? "Una transacción pública de Ethereum. Vector52 nunca solicita conectar una wallet." : "A public Ethereum transaction. Vector52 never asks for a wallet connection."}</small>
        {errors.transactionHash ? (
          <small className="field-error" id="transaction-error" role="alert">
            {errors.transactionHash}
          </small>
        ) : null}
      </label>

      <label className="field" htmlFor="claim">
        <span>{locale === "es" ? "Afirmación a verificar" : "Claim to verify"}</span>
        <textarea
          id="claim"
          name="claim"
          rows={4}
          placeholder={locale === "es" ? "Ejemplo: El sujeto aportó todo el volumen observado en este swap." : "Example: The subject contributed the entire volume observed in this swap."}
          value={values.claim}
          disabled={disabled}
          aria-invalid={Boolean(errors.claim)}
          aria-describedby={errors.claim ? "claim-error" : "claim-help"}
          onChange={(event) => update("claim", event.target.value)}
        />
        <div className="field-meta">
          <small id="claim-help">{locale === "es" ? "Formula una afirmación específica y refutable." : "State one specific, falsifiable claim."}</small>
          <small>{values.claim.length}/1000</small>
        </div>
        {errors.claim ? (
          <small className="field-error" id="claim-error" role="alert">
            {errors.claim}
          </small>
        ) : null}
      </label>

      <label className="field" htmlFor="subject">
        <span>{locale === "es" ? "Dirección del sujeto" : "Subject address"}</span>
        <input
          id="subject"
          name="subject"
          autoComplete="off"
          spellCheck={false}
          placeholder="0x…"
          value={values.subject}
          disabled={disabled}
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? "subject-error" : "subject-help"}
          onChange={(event) => update("subject", event.target.value)}
        />
        <small id="subject-help">{locale === "es" ? "Permite separar volumen del protocolo de flujo directamente atribuible." : "Used to distinguish protocol volume from directly attributable flow."}</small>
        {errors.subject ? (
          <small className="field-error" id="subject-error" role="alert">
            {errors.subject}
          </small>
        ) : null}
      </label>

      <label className="toggle-row" htmlFor="use-ai">
        <input
          id="use-ai"
          name="useAi"
          type="checkbox"
          checked={values.useAi}
          disabled={disabled}
          onChange={(event) => update("useAi", event.target.checked)}
        />
        <span>
          <strong>{locale === "es" ? "Explicación asistida por IA" : "AI-assisted explanation"}</strong>
          <small>{locale === "es" ? "Opcional y no autoritativa. La evidencia y el veredicto siguen siendo deterministas." : "Optional and non-authoritative. Evidence and verdict rules stay deterministic."}</small>
        </span>
      </label>

      <button className="primary-action" type="submit" disabled={disabled}>
        <span>{disabled ? (locale === "es" ? "Auditoría en curso" : "Audit running") : (locale === "es" ? "Ejecutar auditoría" : "Run evidence audit")}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
