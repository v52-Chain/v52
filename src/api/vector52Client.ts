import type { AgentCapabilities, AnchorCaseResponse, AnchorLookupResponse, AuditResult, CaseEvidenceRecord, CaseRecord, ClaimAuditRequest, HealthResponse, McpStatusResponse, McpToolsResponse, VerifyResponse, WalletChallenge, WalletIdentity, WalletSession, WalletVerifyInput, WebCapabilities } from "../domain/apiTypes";

export class Vector52ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status = 0, details?: unknown) {
    super(message);
    this.name = "Vector52ApiError";
    this.status = status;
    this.details = details;
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/$/, "");
// Same-origin by default. Vite proxies these routes locally and Vercel proxies
// them in production, so the browser never depends on cross-origin CORS.
const DEFAULT_API_BASE_URL = "";
export const vector52ApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL);
export const vector52ApiUrl = (path: string) => `${vector52ApiBaseUrl}${path}`;

export class Vector52Client {
  private readonly baseUrl: string;

  constructor(baseUrl = import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL) {
    this.baseUrl = trimTrailingSlash(baseUrl);
  }

  async health(signal?: AbortSignal): Promise<HealthResponse> {
    return this.request<HealthResponse>("/healthz", { signal });
  }

  async auditClaim(payload: ClaimAuditRequest, signal?: AbortSignal): Promise<AuditResult> {
    return this.request<AuditResult>("/v1/claim-audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal
    });
  }

  async walletChallenge(address: string, chainId: 1 | 43113): Promise<WalletChallenge> {
    return this.request<WalletChallenge>("/v1/auth/wallet/challenge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address, chain_id: chainId })
    });
  }

  async walletVerify(payload: WalletVerifyInput): Promise<WalletSession> {
    return this.request<WalletSession>("/v1/auth/wallet/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  async walletIdentity(accessToken: string, signal?: AbortSignal): Promise<WalletIdentity> {
    return this.request<WalletIdentity>("/v1/auth/wallet/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal
    });
  }

  async agentCapabilities(signal?: AbortSignal): Promise<AgentCapabilities> {
    return this.request<AgentCapabilities>("/v1/agent/capabilities", { signal });
  }

  async webCapabilities(signal?: AbortSignal): Promise<WebCapabilities> {
    return this.request<WebCapabilities>("/v1/web/capabilities", { signal });
  }

  async mcpStatus(signal?: AbortSignal): Promise<McpStatusResponse> {
    return this.request<McpStatusResponse>("/v1/integrations/mcp/status", { signal });
  }

  async mcpTools(signal?: AbortSignal): Promise<McpToolsResponse> {
    return this.request<McpToolsResponse>("/v1/integrations/mcp/tools", { signal });
  }

  async getCase(caseId: string, signal?: AbortSignal): Promise<CaseRecord> {
    return this.request<CaseRecord>(`/v1/cases/${encodeURIComponent(caseId)}`, { signal });
  }

  async getCaseEvidence(caseId: string, signal?: AbortSignal): Promise<CaseEvidenceRecord[]> {
    return this.request<CaseEvidenceRecord[]>(`/v1/cases/${encodeURIComponent(caseId)}/evidence`, { signal });
  }

  casePackageUrl(caseId: string): string {
    return `${this.baseUrl}/v1/cases/${encodeURIComponent(caseId)}/package`;
  }

  async anchorCase(caseId: string, supersedes?: string, signal?: AbortSignal): Promise<AnchorCaseResponse> {
    return this.request<AnchorCaseResponse>(`/v1/cases/${encodeURIComponent(caseId)}/anchor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(supersedes ? { supersedes } : {}),
      signal
    });
  }

  async getAnchor(manifestRoot: string, signal?: AbortSignal): Promise<AnchorLookupResponse> {
    return this.request<AnchorLookupResponse>(`/v1/anchors/${encodeURIComponent(manifestRoot)}`, { signal });
  }

  async verifyPackage(file: File, signal?: AbortSignal): Promise<VerifyResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<VerifyResponse>("/v1/verify", {
      method: "POST",
      body: formData,
      signal
    });
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;

    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Accept: "application/json",
          ...init.headers
        }
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new Vector52ApiError(
        "The Vector52 API is unavailable. No fallback or demo data was substituted.",
        0,
        error
      );
    }

    const contentType = response.headers.get("content-type") ?? "";
    const details = contentType.includes("application/json")
      ? await response.json().catch(() => undefined)
      : await response.text().catch(() => undefined);

    if (!response.ok) {
      const detail = typeof details === "object" && details !== null && "detail" in details
        ? (details as { detail: unknown }).detail
        : undefined;
      const apiMessage = typeof detail === "object" && detail !== null && "message" in detail
        ? String((detail as { message: unknown }).message)
        : detail !== undefined
          ? String(detail)
          : `Request failed with status ${response.status}.`;
      throw new Vector52ApiError(apiMessage, response.status, details);
    }

    return details as T;
  }
}

export const vector52Client = new Vector52Client();
