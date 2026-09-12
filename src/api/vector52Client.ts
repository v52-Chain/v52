import type { AuditResult, ClaimAuditRequest, HealthResponse } from "../domain/apiTypes";

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
      const apiMessage =
        typeof details === "object" && details !== null && "detail" in details
          ? String((details as { detail: unknown }).detail)
          : `Request failed with status ${response.status}.`;
      throw new Vector52ApiError(apiMessage, response.status, details);
    }

    return details as T;
  }
}

export const vector52Client = new Vector52Client();
