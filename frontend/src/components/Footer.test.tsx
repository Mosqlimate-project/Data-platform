import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Footer from "./Footer";

const themeState = vi.hoisted(() => ({ theme: "light" }));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: themeState.theme,
    setTheme: vi.fn(),
    resolvedTheme: themeState.theme,
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
    themeState.theme = "light";
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

  it("renders the dark theme button and toggles back to light", () => {
    themeState.theme = "dark";
    render(<Footer />);
    const themeBtn = screen.getByText("footer.theme").closest("button")!;
    expect(themeBtn.querySelector("svg")).toHaveAttribute("class", expect.stringContaining("text-blue-300"));
    fireEvent.click(themeBtn);
  });
});
