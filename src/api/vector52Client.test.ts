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
});
