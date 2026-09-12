import { useState, type FormEvent } from "react";
import type { ClaimAuditRequest } from "../domain/apiTypes";
import {
  toClaimAuditRequest,
  validateAuditForm,
  type AuditFormErrors,
  type AuditFormValues
} from "../domain/validation";

interface AuditFormProps {
  disabled?: boolean;
  onSubmit: (request: ClaimAuditRequest) => void | Promise<void>;
}

const initialValues: AuditFormValues = {
  transactionHash: "",
  claim: "",
  subject: "",
  useAi: false
};

export function AuditForm({ disabled = false, onSubmit }: AuditFormProps) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<AuditFormErrors>({});

  const update = <K extends keyof AuditFormValues>(key: K, value: AuditFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validateAuditForm(values);
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
          <p className="eyebrow">New audit</p>
          <h2>Challenge an onchain claim</h2>
        </div>
        <span className="network-chip">Ethereum · Mainnet</span>
      </div>

      <label className="field" htmlFor="transaction-hash">
        <span>Transaction hash</span>
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
        <small id="transaction-help">A public Ethereum transaction. Vector52 never asks for a wallet connection.</small>
        {errors.transactionHash ? (
          <small className="field-error" id="transaction-error" role="alert">
            {errors.transactionHash}
          </small>
        ) : null}
      </label>

      <label className="field" htmlFor="claim">
        <span>Claim to verify</span>
        <textarea
          id="claim"
          name="claim"
          rows={4}
          placeholder="Example: The subject contributed the entire volume observed in this swap."
          value={values.claim}
          disabled={disabled}
          aria-invalid={Boolean(errors.claim)}
          aria-describedby={errors.claim ? "claim-error" : "claim-help"}
          onChange={(event) => update("claim", event.target.value)}
        />
        <div className="field-meta">
          <small id="claim-help">State one specific, falsifiable claim.</small>
          <small>{values.claim.length}/1000</small>
        </div>
        {errors.claim ? (
          <small className="field-error" id="claim-error" role="alert">
            {errors.claim}
          </small>
        ) : null}
      </label>

      <label className="field" htmlFor="subject">
        <span>Subject address <em>optional</em></span>
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
        <small id="subject-help">Used to distinguish protocol volume from directly attributable flow.</small>
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
          <strong>AI-assisted explanation</strong>
          <small>Optional and non-authoritative. Evidence and verdict rules stay deterministic.</small>
        </span>
      </label>

      <button className="primary-action" type="submit" disabled={disabled}>
        <span>{disabled ? "Audit running" : "Run evidence audit"}</span>
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
