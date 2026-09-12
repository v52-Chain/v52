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

  it("encodes a public wallet and limit in the flow endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ address: "0xabc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new Vector52Client("http://localhost:8000/");

    await client.walletFlow("  0xabc  ", 10);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/wallets/1/0xabc/flow?limit=10",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) })
    );
  });
});
