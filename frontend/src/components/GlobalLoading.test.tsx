import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import GlobalLoading from "./GlobalLoading";

describe("GlobalLoading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows loading initially", () => {
    render(<GlobalLoading />);
    expect(screen.getByAltText("Loading...")).toBeInTheDocument();
  });

  it("returns null after 2 seconds", () => {
    const { container } = render(<GlobalLoading />);
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(container.firstChild).toBeNull();
  });
});
