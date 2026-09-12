import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletFlowForm } from "./WalletFlowForm";

describe("WalletFlowForm locale", () => {
  it("renders the English investigation experience", () => {
    render(<WalletFlowForm locale="en" disabled={false} onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Visualize the real flow." })).toBeVisible();
    expect(screen.getByText(/public data only/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /investigate/i })).toBeDisabled();
  });

  it("submits a valid address without changing the contract", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<WalletFlowForm locale="es" disabled={false} onSubmit={submit} />);

    const address = "0x5C18Cb1245bdca02289e1c1f209846D245d4135C";
    await user.type(screen.getByRole("textbox"), address);
    await user.click(screen.getByRole("button", { name: /investigar/i }));

    expect(submit).toHaveBeenCalledWith(address, 25);
  });
});
