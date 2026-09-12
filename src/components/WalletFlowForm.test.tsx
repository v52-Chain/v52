import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalletFlowForm } from "./WalletFlowForm";

describe("WalletFlowForm locale", () => {
  it("renders the English investigation experience", () => {
    render(<WalletFlowForm locale="en" busy={false} accessLocked={false} onSubmit={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Visualize the real flow." })).toBeVisible();
    expect(screen.getByText(/public data only/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /investigate/i })).toBeDisabled();
  });

  it("submits a valid address without changing the contract", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<WalletFlowForm locale="es" busy={false} accessLocked={false} onSubmit={submit} />);

    const address = "0x5C18Cb1245bdca02289e1c1f209846D245d4135C";
    await user.type(screen.getByRole("textbox"), address);
    await user.click(screen.getByRole("button", { name: /investigar/i }));

    expect(submit).toHaveBeenCalledWith(
      address,
      25,
      expect.objectContaining({ fromDate: expect.any(String), toDate: expect.any(String) })
    );
  });

  it("submits an explicit forensic date window", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<WalletFlowForm locale="es" busy={false} accessLocked={false} onSubmit={submit} />);

    await user.type(screen.getByRole("textbox"), "0x5C18Cb1245bdca02289e1c1f209846D245d4135C");
    await user.click(screen.getByRole("button", { name: "Personalizado" }));
    const dateFields = screen.getAllByDisplayValue("");
    await user.type(dateFields[0], "2026-08-01");
    await user.type(dateFields[1], "2026-08-31");
    await user.click(screen.getByRole("button", { name: /^investigar/i }));

    expect(submit).toHaveBeenCalledWith(expect.any(String), 25, {
      fromDate: "2026-08-01",
      toDate: "2026-08-31"
    });
  });

  it("explains when wallet access is required instead of showing a false loading state", () => {
    render(<WalletFlowForm locale="es" busy={false} accessLocked onSubmit={vi.fn()} />);

    expect(screen.getByRole("button", { name: /verifica tu wallet/i })).toBeDisabled();
  });
});
