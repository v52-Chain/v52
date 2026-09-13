import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WalletClient } from "viem";
import type { AgentCapabilities } from "../domain/apiTypes";

const mocks = vi.hoisted(() => ({
  paidFetch: vi.fn(),
  register: vi.fn(),
  policy: undefined as undefined | ((version: number, requirements: Array<Record<string, string>>) => Array<Record<string, string>>)
}));

vi.mock("@x402/fetch", () => ({
  wrapFetchWithPayment: () => mocks.paidFetch
}));

vi.mock("@x402/core/client", () => ({
  x402Client: class {
    setSpendControls() { return this; }
    registerPolicy(policy: typeof mocks.policy) { mocks.policy = policy; return this; }
  },
  x402HTTPClient: class {
    parsePaymentResult() { return { paymentStatus: "settled" }; }
  }
}));

vi.mock("@x402/evm/exact/client", () => ({
  registerExactEvmScheme: mocks.register
}));

import { investigateWithX402 } from "./x402Payment";

const capabilities: AgentCapabilities = {
  channel: "AGENT_X402",
  ready: true,
  endpoint: "/v1/agent/investigations/wallet-flow",
  payment_protocol: "x402",
  network: "eip155:43113",
  asset: "0x5425890298aed601595a70AB815c96711a31Bc65",
  pay_to: "0xf92A1E3Fa1a163FEeB8c3753165410374fB08339",
  amount_atomic: "1000",
  amount_display: "0.001",
  asset_decimals: 6,
  billing_model: "PER_REQUEST",
  automatic_payment_owner: "MCP_CLIENT",
  warnings: []
};

describe("investigateWithX402", () => {
  beforeEach(() => {
    mocks.paidFetch.mockReset();
    mocks.register.mockClear();
    mocks.policy = undefined;
  });

  it("executes exactly one paid web investigation with the selected filters", async () => {
    mocks.paidFetch.mockResolvedValue(new Response(JSON.stringify({
      channel: "WEB",
      actor_wallet: "0x45642fe79bad8df9b6314caa917cdc6c71ca0ee2",
      result: { incoming: [], outgoing: [] }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Payment-Response": "receipt" }
    }));
    const wallet = {
      account: { address: "0x45642FE79BaD8Df9B6314CaA917cDC6C71CA0Ee2" },
      signTypedData: vi.fn()
    } as unknown as WalletClient;

    await investigateWithX402(
      wallet,
      capabilities,
      "verified-session",
      "0xACA28ee612b506826E1205DEa34FE48f7F741918",
      25,
      { fromDate: "2026-09-01", toDate: "2026-09-12" }
    );

    expect(mocks.paidFetch).toHaveBeenCalledOnce();
    const [url, request] = mocks.paidFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/v1\/web\/investigations\/wallet-flow$/);
    expect(request.headers).toMatchObject({ Authorization: "Bearer verified-session" });
    expect(JSON.parse(String(request.body))).toMatchObject({
      target_address: "0xACA28ee612b506826E1205DEa34FE48f7F741918",
      limit: 25,
      from_date: "2026-09-01",
      to_date: "2026-09-12"
    });

    const expected = {
      scheme: "exact",
      network: capabilities.network,
      asset: capabilities.asset,
      amount: capabilities.amount_atomic,
      payTo: capabilities.pay_to!
    };
    expect(mocks.policy?.(2, [expected])).toEqual([expected]);
    expect(mocks.policy?.(2, [{ ...expected, payTo: "0x5C18Cb1245bdca02289e1c1f209846D245d4135C" }])).toEqual([]);
    expect(mocks.policy?.(2, [{ ...expected, amount: "2000" }])).toEqual([]);
  });
});
