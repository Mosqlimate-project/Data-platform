import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

const translations: Record<string, string> = {};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: {
      language: (global as any).__lang || "en",
    },
    t: (k: string) => translations[k] || k,
  }),
}));

describe("useDateFormatter", () => {
  beforeEach(() => {
    (global as any).__lang = "en";
  });
  afterEach(() => {
    delete (global as any).__lang;
  });

  it("formats as MM/DD/YYYY for english", async () => {
    const { useDateFormatter } = await import("./useDateFormatter");
    const { result } = renderHook(() => useDateFormatter());
    expect(result.current.dateFormatPattern).toBe("MM/DD/YYYY");
    expect(result.current.formatDate("2024-01-07")).toBe("01/07/2024");
  });

  it("formats as DD/MM/YYYY for non-english", async () => {
    (global as any).__lang = "pt";
    const { useDateFormatter } = await import("./useDateFormatter");
    const { result } = renderHook(() => useDateFormatter());
    expect(result.current.dateFormatPattern).toBe("DD/MM/YYYY");
    expect(result.current.formatDate("2024-01-07")).toBe("07/01/2024");
  });

  it("returns empty string for empty input", async () => {
    const { useDateFormatter } = await import("./useDateFormatter");
    const { result } = renderHook(() => useDateFormatter());
    expect(result.current.formatDate("")).toBe("");
  });

  it("returns input when not a valid ISO date", async () => {
    const { useDateFormatter } = await import("./useDateFormatter");
    const { result } = renderHook(() => useDateFormatter());
    expect(result.current.formatDate("2024")).toBe("2024");
  });
});
