import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import LanguageSelector from "./Language";

const { mockChangeLanguage, mockOn, mockOff } = vi.hoisted(() => ({
  mockChangeLanguage: vi.fn(),
  mockOn: vi.fn(),
  mockOff: vi.fn(),
}));

const langState = vi.hoisted(() => ({ language: "en" }));

vi.mock("@/lib/i18n", () => ({
  default: {
    get language() {
      return langState.language;
    },
    changeLanguage: mockChangeLanguage,
    on: mockOn,
    off: mockOff,
  },
}));

describe("LanguageSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    langState.language = "en";
    mockChangeLanguage.mockClear();
    mockOn.mockClear();
    mockOff.mockClear();
  });

  it("renders the language button", () => {
    render(<LanguageSelector />);
    expect(screen.getByLabelText("Change Language")).toBeInTheDocument();
  });

  it("opens and selects a language", () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByLabelText("Change Language"));
    expect(screen.getByText("PT")).toBeInTheDocument();
    fireEvent.click(screen.getByText("PT"));
    expect(mockChangeLanguage).toHaveBeenCalledWith("pt");
    expect(localStorage.getItem("i18nextLng")).toBe("pt");
  });

  it("uses saved language from localStorage", () => {
    localStorage.setItem("i18nextLng", "es");
    render(<LanguageSelector />);
    fireEvent.click(screen.getByLabelText("Change Language"));
    expect(screen.getByText("ES")).toBeInTheDocument();
  });

  it("closes when clicking outside", () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getByLabelText("Change Language"));
    expect(screen.getByText("EN")).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("EN")).not.toBeInTheDocument();
  });

  it("falls back to en when there is no saved language and i18n is empty", () => {
    langState.language = "";
    render(<LanguageSelector />);
    fireEvent.click(screen.getByLabelText("Change Language"));
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("updates the button and document lang when i18n emits languageChanged", () => {
    const { unmount } = render(<LanguageSelector />);
    const handler = mockOn.mock.calls.find((c) => c[0] === "languageChanged")?.[1] as (lng: string) => void;
    expect(handler).toBeTypeOf("function");

    act(() => handler("es"));
    expect(document.documentElement.lang).toBe("es");

    unmount();
    expect(mockOff).toHaveBeenCalledWith("languageChanged", expect.any(Function));
  });
});
