import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebCapabilities, WebWalletFlowResponse } from "../domain/apiTypes";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  signMessage: vi.fn(),
  switchChain: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
  identity: vi.fn(),
  investigate: vi.fn(),
  connected: true
}));

vi.mock("@reown/appkit/react", () => ({
  useAppKit: () => ({ open: mocks.open }),
  useAppKitAccount: () => ({
    address: mocks.connected ? "0x45642FE79BaD8Df9B6314CaA917cDC6C71CA0Ee2" : undefined,
    isConnected: mocks.connected
  })
}));

vi.mock("wagmi", () => ({
  useChainId: () => 1,
  useSignMessage: () => ({ signMessageAsync: mocks.signMessage }),
  useSwitchChain: () => ({ switchChainAsync: mocks.switchChain }),
  useWalletClient: () => ({
    data: mocks.connected
      ? { account: { address: "0x45642FE79BaD8Df9B6314CaA917cDC6C71CA0Ee2" }, signTypedData: vi.fn() }
      : undefined
  })
}));

vi.mock("../api/vector52Client", () => ({
  Vector52ApiError: class extends Error {
    constructor(message: string, public status: number) { super(message); }
  },
  vector52Client: {
    walletChallenge: mocks.challenge,
    walletVerify: mocks.verify,
    walletIdentity: mocks.identity,
    agentCapabilities: vi.fn()
  }
}));

vi.mock("../web3/x402Payment", () => ({ investigateWithX402: mocks.investigate }));

import { PaidWalletFlow } from "./PaidWalletFlow";

const capabilities: WebCapabilities = {
  channel: "WEB_X402",
  ready: true,
  endpoint: "/v1/web/investigations/wallet-flow",
  payment_protocol: "x402",
  network: "eip155:43113",
  asset: "0x5425890298aed601595a70AB815c96711a31Bc65",
  pay_to: "0xf92A1E3Fa1a163FEeB8c3753165410374fB08339",
  amount_atomic: "1000",
  amount_display: "0.001",
  asset_decimals: 6,
  billing_model: "PER_REQUEST",
  automatic_payment_owner: "CONNECTED_WALLET",
  authentication: "SIGNED_CHALLENGE",
  warnings: []
};

const response = {
  channel: "WEB",
  actor_wallet: "0x45642FE79BaD8Df9B6314CaA917cDC6C71CA0Ee2",
  result: { incoming: [], outgoing: [] }
} as unknown as WebWalletFlowResponse;

const fillAndSubmit = () => {
  fireEvent.change(screen.getByLabelText(/dirección pública/i), {
    target: { value: "0xACA28ee612b506826E1205DEa34FE48f7F741918" }
  });
  fireEvent.click(screen.getByRole("button", { name: /firmar y pagar|conectar wallet/i }));
};

describe("PaidWalletFlow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.connected = true;
    mocks.challenge.mockResolvedValue({ nonce: "n1", message: "Vector52 challenge", expires_at: "2099-01-01T00:00:00Z" });
    mocks.signMessage.mockResolvedValue("0xsigned");
    mocks.verify.mockResolvedValue({
      access_token: "session-token",
      token_type: "bearer",
      address: "0x45642FE79BaD8Df9B6314CaA917cDC6C71CA0Ee2",
      chain_id: 43113,
      expires_at: "2099-01-01T00:00:00Z"
    });
    mocks.identity.mockResolvedValue({ channel: "WEB" });
    mocks.investigate.mockResolvedValue(response);
  });

  it("authenticates, pays and investigates without reopening Reown when already connected", async () => {
    const onSuccess = vi.fn();
    render(<PaidWalletFlow locale="es" busy={false} session={null} capabilities={capabilities} onSession={vi.fn()} onStart={vi.fn()} onSuccess={onSuccess} onError={vi.fn()} />);
    fillAndSubmit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(response));
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.switchChain).toHaveBeenCalledWith({ chainId: 43113 });
    expect(mocks.challenge).toHaveBeenCalledWith("0x45642FE79BaD8Df9B6314CaA917cDC6C71CA0Ee2", 43113);
    expect(mocks.identity).toHaveBeenCalledWith("session-token");
    expect(mocks.investigate).toHaveBeenCalledOnce();
  });

  it("opens Reown only when no wallet is connected", async () => {
    mocks.connected = false;
    render(<PaidWalletFlow locale="es" busy={false} session={null} capabilities={capabilities} onSession={vi.fn()} onStart={vi.fn()} onSuccess={vi.fn()} onError={vi.fn()} />);
    fillAndSubmit();

    await waitFor(() => expect(mocks.open).toHaveBeenCalledOnce());
    expect(mocks.investigate).not.toHaveBeenCalled();
  });
});
