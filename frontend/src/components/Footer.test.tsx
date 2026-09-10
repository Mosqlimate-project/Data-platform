import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Footer from "./Footer";

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn(),
    resolvedTheme: "light",
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: "en" },
  }),
}));

describe("Footer", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders footer after mount", () => {
    render(<Footer />);
    expect(screen.getByText("Mosqlimate")).toBeInTheDocument();
  });

  it("toggles citation visibility", () => {
    render(<Footer />);
    const citeBtn = screen.getByText("footer.cite_show");
    fireEvent.click(citeBtn);
    expect(screen.getByText("footer.cite_hide")).toBeInTheDocument();
  });

  it("toggles theme via button", () => {
    render(<Footer />);
    const themeBtn = screen.getByText("footer.theme");
    fireEvent.click(themeBtn);
  });
});
