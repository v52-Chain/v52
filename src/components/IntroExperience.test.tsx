import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { IntroExperience } from "./IntroExperience";

describe("IntroExperience", () => {
  it("presents the project before entering the workspace", () => {
    render(<IntroExperience locale="es" onLocale={vi.fn()} onEnter={vi.fn()} />);

    expect(screen.getByRole("heading", { name: /perdiste cripto/i })).toBeVisible();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("lets the user skip directly to the investigation workspace", async () => {
    const onEnter = vi.fn();
    const user = userEvent.setup();
    render(<IntroExperience locale="en" onLocale={vi.fn()} onEnter={onEnter} />);

    await user.click(screen.getByRole("button", { name: /skip intro/i }));
    expect(onEnter).toHaveBeenCalledOnce();
  });
});
