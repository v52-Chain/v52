import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuditForm } from "./AuditForm";

describe("AuditForm", () => {
  it("shows actionable validation without calling the API", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<AuditForm onSubmit={submit} />);

    await user.click(screen.getByRole("button", { name: /run evidence audit/i }));

    expect(await screen.findByText(/64 hexadecimal characters/i)).toBeVisible();
    expect(screen.getByText(/at least 12 characters/i)).toBeVisible();
    expect(submit).not.toHaveBeenCalled();
  });

  it("emits the agreed request contract", async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<AuditForm onSubmit={submit} />);

    const hash = `0x${"1".repeat(64)}`;
    const subject = `0x${"2".repeat(40)}`;
    await user.type(screen.getByLabelText(/transaction hash/i), hash);
    await user.type(screen.getByLabelText(/claim to verify/i), "The subject contributed all observed volume.");
    await user.type(screen.getByLabelText(/subject address/i), subject);
    await user.click(screen.getByRole("button", { name: /run evidence audit/i }));

    expect(submit).toHaveBeenCalledWith({
      chain_id: 1,
      transaction_hash: hash,
      claim: "The subject contributed all observed volume.",
      subject,
      use_ai: false
    });
  });
});
