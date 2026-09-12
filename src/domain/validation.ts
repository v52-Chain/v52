import type { ClaimAuditRequest } from "./apiTypes";

const TRANSACTION_HASH = /^0x[a-fA-F0-9]{64}$/;
const ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export interface AuditFormValues {
  transactionHash: string;
  claim: string;
  subject: string;
  useAi: boolean;
}

export type AuditFormErrors = Partial<Record<keyof AuditFormValues, string>>;

export function validateAuditForm(values: AuditFormValues): AuditFormErrors {
  const errors: AuditFormErrors = {};
  const transactionHash = values.transactionHash.trim();
  const claim = values.claim.trim();
  const subject = values.subject.trim();

  if (!TRANSACTION_HASH.test(transactionHash)) {
    errors.transactionHash = "Enter a 0x-prefixed transaction hash with 64 hexadecimal characters.";
  }

  if (claim.length < 12) {
    errors.claim = "Describe a specific claim using at least 12 characters.";
  } else if (claim.length > 1000) {
    errors.claim = "Keep the claim under 1,000 characters for this MVP.";
  }

  if (subject && !ADDRESS.test(subject)) {
    errors.subject = "Enter a valid 0x-prefixed Ethereum address or leave this field empty.";
  }

  return errors;
}

export function toClaimAuditRequest(values: AuditFormValues): ClaimAuditRequest {
  const subject = values.subject.trim();

  return {
    chain_id: 1,
    transaction_hash: values.transactionHash.trim(),
    claim: values.claim.trim(),
    ...(subject ? { subject } : {}),
    use_ai: values.useAi
  };
}
