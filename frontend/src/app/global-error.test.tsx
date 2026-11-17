import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GlobalError from "./global-error";

describe("app/global-error", () => {
  it("renders its own document, retries and logs the error", () => {
    const reset = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<GlobalError error={new Error("boom")} reset={reset} />);

    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith("Global error:", expect.any(Error));

    fireEvent.click(screen.getByText("Try again"));
    expect(reset).toHaveBeenCalledTimes(1);

    consoleError.mockRestore();
  });
});
