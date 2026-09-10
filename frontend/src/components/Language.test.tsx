import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LanguageSelector from "./Language";

const { mockChangeLanguage, mockOn, mockOff } = vi.hoisted(() => ({
  mockChangeLanguage: vi.fn(),
  mockOn: vi.fn(),
  mockOff: vi.fn(),
}));

vi.mock("@/lib/i18n", () => ({
  default: {
    language: "en",
    changeLanguage: mockChangeLanguage,
    on: mockOn,
    off: mockOff,
  },
}));

describe("LanguageSelector", () => {
  beforeEach(() => {
    localStorage.clear();
    mockChangeLanguage.mockClear();
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
});
