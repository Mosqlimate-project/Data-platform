import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import SearchBar from "./SearchBar";

describe("app/models/components/SearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders with the default placeholder and calls onSearch after the delay", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} />);
    const input = screen.getByPlaceholderText("Search");

    fireEvent.change(input, { target: { value: "  dengue  " } });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onSearch).toHaveBeenCalledWith("dengue");
  });

  it("uses custom placeholder and delay", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} placeholder="Find" delay={1000} />);
    fireEvent.change(screen.getByPlaceholderText("Find"), { target: { value: "x" } });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onSearch).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onSearch).toHaveBeenCalledWith("x");
  });

  it("clears the value with the clear button", () => {
    const onSearch = vi.fn();
    render(<SearchBar onSearch={onSearch} delay={50} />);
    const input = screen.getByPlaceholderText("Search");
    fireEvent.change(input, { target: { value: "abc" } });
    expect(screen.getByLabelText("Clear search")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(input).toHaveValue("");

    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onSearch).toHaveBeenLastCalledWith("");
  });
});
