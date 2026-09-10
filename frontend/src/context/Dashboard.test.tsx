import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import { DashboardProvider, useDashboard } from "./Dashboard";

function renderDashboard(search = "") {
  if (search) {
    Object.defineProperty(window, "location", {
      value: { search, pathname: "/dashboard", href: `/dashboard${search}` },
      configurable: true,
      writable: true,
    });
  }
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <DashboardProvider>{children}</DashboardProvider>
  );
  return renderHook(() => useDashboard(), { wrapper });
}

describe("context/Dashboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides default state without query params", () => {
    Object.defineProperty(window, "location", {
      value: { search: "", pathname: "/dashboard" },
      configurable: true,
      writable: true,
    });
    const { result } = renderDashboard("");
    expect(result.current.state.disease).toBe("");
    expect(result.current.state.adm_level).toBe(1);
    expect(result.current.state.case_definition).toBe("reported");
    expect(result.current.state.sprint).toBe(false);
  });

  it("reads initial state from query params", () => {
    Object.defineProperty(window, "location", {
      value: {
        search: "?disease=A90&adm_level=2&sprint=true&prediction_id=5",
        pathname: "/dashboard",
      },
      configurable: true,
      writable: true,
    });
    const { result } = renderDashboard("");
    expect(result.current.state.disease).toBe("A90");
    expect(result.current.state.adm_level).toBe(2);
    expect(result.current.state.sprint).toBe(true);
    expect(result.current.state.prediction_id).toBe("5");
  });

  it("updateState merges and rewrites the URL", () => {
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
      value: { search: "", pathname: "/dashboard" },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "history", {
      value: { replaceState: replace },
      configurable: true,
      writable: true,
    });
    const { result } = renderDashboard("");
    act(() => {
      result.current.updateState({ disease: "A90", adm_level: 0 });
    });
    expect(result.current.state.disease).toBe("A90");
    expect(result.current.state.adm_level).toBe(0);
    expect(replace).toHaveBeenCalledWith(
      null,
      "",
      "/dashboard?disease=A90&adm_level=0"
    );
  });

  it("updateState removes empty params", () => {
    const replace = vi.fn();
    Object.defineProperty(window, "location", {
      value: { search: "?disease=A90", pathname: "/dashboard" },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(window, "history", {
      value: { replaceState: replace },
      configurable: true,
      writable: true,
    });
    const { result } = renderDashboard("");
    act(() => {
      result.current.updateState({ disease: "" });
    });
    expect(replace).toHaveBeenCalledWith(null, "", "/dashboard");
  });

  it("useDashboard throws outside provider", () => {
    const { renderHook } = require("@testing-library/react");
    expect(() => renderHook(() => useDashboard())).toThrow(
      "useDashboard must be used within a DashboardProvider"
    );
  });
});
