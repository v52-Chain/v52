export type CaseStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETE"
  | "PARTIAL"
  | "WARNING"
  | "FAILED"
  | "UNKNOWN";

export type Verdict =
  | "SUPPORTED"
  | "PARTIALLY_SUPPORTED"
  | "MISLEADING"
  | "REFUTED"
  | "UNKNOWN";

export type AuthorityLevel =
  | "L0_CHAIN_PRIMARY"
  | "L1_INDEXED"
  | "L2_DECODED"
  | "L3_DERIVED"
  | "L4_ANALYST"
  | "L5_AI_EXPLANATION";

export interface ClaimAuditRequest {
  chain_id: 1;
  transaction_hash: string;
  claim: string;
  subject?: string;
  use_ai: boolean;
}

export interface EvidenceItem {
  evidence_id: string;
  authority_level: AuthorityLevel;
  source: string;
  method?: string;
  retrieved_at?: string;
  raw_sha256?: string;
  status: CaseStatus;
  block_number?: number;
  summary?: string;
  warnings?: string[];
}

export interface PredicateResult {
  predicate_id: string;
  description: string;
  outcome: "TRUE" | "FALSE" | "UNKNOWN";
  evidence_ids: string[];
}

export interface TokenAmount {
  address: string;
  symbol?: string;
  raw_amount: string;
  formatted_amount?: string;
}

export interface ProtocolAction {
  protocol: "uniswap_v3" | string;
  action: string;
  pool?: string;
  router?: string;
  sender?: string;
  recipient?: string;
  token_in?: TokenAmount;
  token_out?: TokenAmount;
  evidence_ids: string[];
  warnings: string[];
}

export interface ContributionResult {
  subject?: string;
  attributable_value?: string;
  protocol_volume?: string;
  unit?: string;
  ratio?: number;
  evidence_ids: string[];
  warnings: string[];
}

export interface ProviderProvenance {
  provider: string;
  status: CaseStatus;
  block_number?: number;
  has_indexing_errors?: boolean;
  request_fingerprint?: string;
}

export interface AuditResult {
  case_id: string;
  status: CaseStatus;
  verdict: Verdict;
  summary: string;
  predicates: PredicateResult[];
  evidence_for: EvidenceItem[];
  evidence_against: EvidenceItem[];
  gaps: string[];
  warnings: string[];
  protocol_action: ProtocolAction | null;
  contribution: ContributionResult | null;
  provenance: {
    providers: ProviderProvenance[];
  };
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
}

export type RequestPhase = "IDLE" | "RUNNING" | "SUCCESS" | "ERROR";
