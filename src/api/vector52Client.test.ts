import { describe, expect, it, vi } from "vitest";
import { Vector52ApiError, Vector52Client } from "./vector52Client";

describe("Vector52Client", () => {
  it("fails explicitly when the API is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    const client = new Vector52Client("http://localhost:8000");

    await expect(client.health()).rejects.toMatchObject<Vector52ApiError>({
      name: "Vector52ApiError",
      status: 0,
      message: expect.stringContaining("No fallback or demo data")
    });
  });

  it("sends a wallet-authenticated investigation to the web boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ address: "0xabc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new Vector52Client("http://localhost:8000/");

    await client.webWalletFlow("  0xabc  ", 10, {}, "browser-session");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/web/investigations/wallet-flow",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer browser-session" }),
        body: expect.stringContaining('"target_address":"0xabc"')
      })
    );
  });

  it("sends the selected evidence time window", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ address: "0xabc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new Vector52Client("http://localhost:8000");

    await client.webWalletFlow(
      "0xabc",
      25,
      { fromDate: "2026-08-01", toDate: "2026-08-31" },
      "browser-session"
    );

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      from_date: "2026-08-01",
      to_date: "2026-08-31"
    });
  });
});
