import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ChatbotIcon from "./Icon";

describe("components/chatbot/Icon", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows balloon after initial timer and toggles", () => {
    render(<ChatbotIcon />);
    const balloon = screen.getByText("Need help?");
    expect(balloon.className).toContain("opacity-0");
    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.getByText("Need help?").className).toContain("opacity-100");
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByText("Need help?").className).toContain("opacity-0");
  });
});
