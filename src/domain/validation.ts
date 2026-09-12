import type { ClaimAuditRequest } from "./apiTypes";
import type { Locale } from "./locale";

const TRANSACTION_HASH = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export interface AuditFormValues {
  transactionHash: string;
  claim: string;
  subject: string;
  useAi: boolean;
}

export type AuditFormErrors = Partial<Record<keyof AuditFormValues, string>>;

export function validateAuditForm(values: AuditFormValues, locale: Locale = "en"): AuditFormErrors {
  const errors: AuditFormErrors = {};
  const transactionHash = values.transactionHash.trim();
  const claim = values.claim.trim();
  const subject = values.subject.trim();

  if (!TRANSACTION_HASH.test(transactionHash)) {
    errors.transactionHash = locale === "es"
      ? "Ingresa un hash 0x con 64 caracteres hexadecimales."
      : "Enter a 0x-prefixed transaction hash with 64 hexadecimal characters.";
  }

  if (claim.length < 12) {
    errors.claim = locale === "es"
      ? "Describe una afirmación específica con al menos 12 caracteres."
      : "Describe a specific claim using at least 12 characters.";
  } else if (claim.length > 1000) {
    errors.claim = locale === "es"
      ? "Mantén la afirmación por debajo de 1.000 caracteres."
      : "Keep the claim under 1,000 characters for this MVP.";
  }

  if (!ADDRESS.test(subject)) {
    errors.subject = locale === "es"
      ? "Ingresa una dirección Ethereum válida con prefijo 0x."
      : "Enter a valid 0x-prefixed Ethereum address.";
  }

  return errors;
}

export function toClaimAuditRequest(values: AuditFormValues): ClaimAuditRequest {
  return {
    chain_id: 1,
    transaction_hash: values.transactionHash.trim(),
    claim: values.claim.trim(),
    subject: values.subject.trim(),
    use_ai: values.useAi
  };
}
