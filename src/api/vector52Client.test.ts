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

  it("validates the browser session before entering the paid boundary", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ channel: "WEB", address: "0xabc" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new Vector52Client("http://localhost:8000/");

    await client.walletIdentity("browser-session");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/auth/wallet/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer browser-session" })
      })
    );
  });

  it("reads MCP status and tools through the backend boundary", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "READY" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "READY", tools: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    vi.stubGlobal("fetch", fetchMock);
    const client = new Vector52Client("https://api.vector52.test");

    await client.mcpStatus();
    await client.mcpTools();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.vector52.test/v1/integrations/mcp/status",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.vector52.test/v1/integrations/mcp/tools",
      expect.any(Object)
    );
  });

  it("reads the browser payment contract from the web channel", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ channel: "WEB_X402", ready: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);
    const client = new Vector52Client("https://api.vector52.test");

    await client.webCapabilities();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.vector52.test/v1/web/capabilities",
      expect.objectContaining({ headers: expect.objectContaining({ Accept: "application/json" }) })
    );
  });
});
