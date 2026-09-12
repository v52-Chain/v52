export type CaseStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETE"
  | "DEGRADED"
  | "FAILED";

export type EvidenceStatus =
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
  subject: string;
  use_ai: boolean;
}

export interface EvidenceItem {
  evidence_id: string;
  authority_level: AuthorityLevel;
  source: string;
  method?: string;
  retrieved_at?: string;
  raw_sha256?: string;
  status: EvidenceStatus;
  block_number?: number;
  request_fingerprint?: string;
  raw_path?: string;
  adapter_version?: string;
  indexing_errors?: boolean | null;
  graph_deployment?: string | null;
  warnings?: string[];
}

export interface PredicateResult {
  id: string;
  statement: string;
  result: boolean | null;
  confidence?: string | null;
  evidence_ids: string[];
  reasoning?: string | null;
}

export interface TokenInfo {
  address: string;
  symbol?: string;
  decimals?: number | null;
  name?: string | null;
}

export interface SwapEvent {
  pool_address: string;
  token0: TokenInfo;
  token1: TokenInfo;
  sender: string;
  recipient: string;
  router?: string | null;
  amount0: string;
  amount1: string;
  amount_in_raw: string;
  amount_out_raw: string;
  token_in: TokenInfo;
  token_out: TokenInfo;
  evidence_ids: string[];
  warnings: string[];
}

export interface ProtocolAction {
  protocol: "uniswap_v3" | string;
  action: string;
  swap?: SwapEvent | null;
  subject_address?: string | null;
  contribution_evidence_ids: string[];
  warnings: string[];
  subject_contribution_proven: boolean;
  ambiguous_intermediary: boolean;
}

export interface ContributionResult {
  subject: string;
  amount_in_raw?: string | null;
  amount_out_raw?: string | null;
  token_in_symbol?: string | null;
  token_out_symbol?: string | null;
  percentage_of_pool_volume?: string | null;
  warnings: string[];
}

export interface AuditResult {
  case_id: string;
  status: CaseStatus;
  verdict: Verdict | null;
  summary: string;
  predicates: PredicateResult[];
  evidence_for: EvidenceItem[];
  evidence_against: EvidenceItem[];
  gaps: string[];
  warnings: string[];
  protocol_action: ProtocolAction | null;
  contribution: ContributionResult | null;
  provenance: {
    case_id: string;
    tx_hash: string;
    chain_id: number;
    evidence_record_ids: string[];
    vault_paths: string[];
    adapter_versions: string[];
  } | null;
  timing_ms: Record<string, number>;
}

export interface HealthResponse {
  status: "ok" | "degraded";
  version: string;
}

export interface FlowTransfer {
  transfer_id: string;
  direction: "IN" | "OUT";
  counterparty: string;
  tx_hash: string;
  block_number?: number | null;
  timestamp?: string | null;
  asset: string;
  category: string;
  value?: string | null;
  contract_address?: string | null;
  token_id?: string | null;
}

export interface WalletFlowResult {
  chain_id: 1;
  network: "ethereum-mainnet";
  address: string;
  acquired_at: string;
  incoming: FlowTransfer[];
  outgoing: FlowTransfer[];
  source: {
    provider: "alchemy";
    method: "alchemy_getAssetTransfers";
    authority: "L1_INDEXED";
  };
  limits: {
    requested_per_direction: number;
    returned_incoming: number;
    returned_outgoing: number;
    truncated: boolean;
  };
  warnings: string[];
}

export type RequestPhase = "IDLE" | "RUNNING" | "SUCCESS" | "ERROR";
