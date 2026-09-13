import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  open: vi.fn(),
  switchChain: vi.fn(),
  refetch: vi.fn()
}));

vi.mock("@reown/appkit/react", () => ({
  createAppKit: vi.fn(),
  useAppKit: () => ({ open: mocks.open }),
  useAppKitAccount: () => ({
    address: "0x5C18Cb1245bdca02289e1c1f209846D245d4135C",
    isConnected: true
  })
}));

vi.mock("wagmi", () => ({
  useChainId: () => 43113,
  useSwitchChain: () => ({ switchChainAsync: mocks.switchChain, isPending: false }),
  useBalance: ({ token }: { token?: string }) => ({
    data: { formatted: token ? "20" : "3.5" },
    isLoading: false,
    refetch: mocks.refetch
  })
}));

import { WalletAccess, WalletMenuButton } from "./WalletAccess";

describe("WalletAccess", () => {
  it("shows the live Reown account and Fuji balances without a verification action", () => {
    render(<WalletAccess locale="es" session={null} onSession={vi.fn()} />);

    expect(screen.getByText("WALLET CONECTADA")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("3.5")).toBeInTheDocument();
    expect(screen.getByText("Avalanche Fuji")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /verificar/i })).not.toBeInTheDocument();
    expect(screen.getByText(/firma de sesión y el pago se solicitarán al investigar/i)).toBeInTheDocument();
  });

  it("uses the Reown connection for the header state before backend authentication", () => {
    render(<WalletMenuButton locale="es" onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /wallet conectada/i })).toHaveTextContent("0x5C18…135C");
  });
});
