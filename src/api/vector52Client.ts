import type { AccessPlans, AgentCapabilities, AuditResult, ClaimAuditRequest, CreditBalance, HealthResponse, WalletChallenge, WalletFlowFilters, WalletSession, WalletVerifyInput, WebWalletFlowResponse } from "../domain/apiTypes";

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
export const vector52ApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? "");
export const vector52ApiUrl = (path: string) => `${vector52ApiBaseUrl}${path}`;

export class Vector52Client {
  private readonly baseUrl: string;

  constructor(baseUrl = import.meta.env.VITE_API_BASE_URL ?? "") {
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

  async webWalletFlow(address: string, limit: number, filters: WalletFlowFilters, accessToken: string, signal?: AbortSignal): Promise<WebWalletFlowResponse> {
    return this.request<WebWalletFlowResponse>("/v1/web/investigations/wallet-flow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        target_address: address.trim(),
        chain_id: 1,
        limit,
        from_date: filters.fromDate,
        to_date: filters.toDate
      }),
      signal
    });
  }

  async accessPlans(signal?: AbortSignal): Promise<AccessPlans> {
    return this.request<AccessPlans>("/v1/web/plans", { signal });
  }

  async creditBalance(accessToken: string, signal?: AbortSignal): Promise<CreditBalance> {
    return this.request<CreditBalance>("/v1/web/credits", {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal
    });
  }

  async agentCapabilities(signal?: AbortSignal): Promise<AgentCapabilities> {
    return this.request<AgentCapabilities>("/v1/agent/capabilities", { signal });
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
