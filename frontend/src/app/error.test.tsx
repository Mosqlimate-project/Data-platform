import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorPage from "./error";

describe("app/error", () => {
  it("renders the 500 message, retries and links home", () => {
    const reset = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ErrorPage error={new Error("boom")} reset={reset} />);

    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("errors.server_error.title")).toBeInTheDocument();
    expect(screen.getByText("errors.server_error.description")).toBeInTheDocument();
    expect(consoleError).toHaveBeenCalledWith("Route error:", expect.any(Error));

    fireEvent.click(screen.getByText("errors.server_error.retry"));
    expect(reset).toHaveBeenCalledTimes(1);

    const link = screen.getByText("errors.server_error.back_home").closest("a");
    expect(link).toHaveAttribute("href", "/");

    consoleError.mockRestore();
  });
});
