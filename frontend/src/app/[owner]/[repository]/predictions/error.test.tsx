import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorComponent from "./error";

describe("app/[owner]/[repository]/predictions/error", () => {
  it("renders the error message and resets", () => {
    const reset = vi.fn();
    render(<ErrorComponent error={new globalThis.Error("boom")} reset={reset} />);
    expect(screen.getByText("Failed to load predictions")).toBeInTheDocument();
    expect(screen.getByText("boom")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    expect(reset).toHaveBeenCalled();
  });

  it("shows a fallback message when the error has none", () => {
    render(<ErrorComponent error={new globalThis.Error("")} reset={vi.fn()} />);
    expect(
      screen.getByText(/An unexpected error occurred while fetching predictions/)
    ).toBeInTheDocument();
  });
});
