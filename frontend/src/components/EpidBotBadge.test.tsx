import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EpidBotBadge from "./EpidBotBadge";

const state = vi.hoisted(() => ({ language: "en", resolvedTheme: "dark" }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    i18n: { language: state.language },
    t: (k: string) => k,
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: state.resolvedTheme,
    resolvedTheme: state.resolvedTheme,
    setTheme: vi.fn(),
  }),
}));

describe("EpidBotBadge", () => {
  beforeEach(() => {
    state.language = "en";
    state.resolvedTheme = "dark";
    vi.restoreAllMocks();
  });

  it("renders the badge link", () => {
    render(<EpidBotBadge />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://epidbot.kwar-ai.com.br");
    expect(screen.getByText(/Explore with/)).toBeInTheDocument();
    expect(screen.getByText("EpidBot")).toBeInTheDocument();
  });

  it("changes style on hover", () => {
    render(<EpidBotBadge />);
    const link = screen.getByRole("link");
    fireEvent.mouseEnter(link);
    expect(link.style.transform).toBe("translateY(-1px)");
    fireEvent.mouseLeave(link);
    expect(link.style.transform).toBe("");
  });

  it("renders the Portuguese prefix for pt languages", () => {
    state.language = "pt-BR";
    render(<EpidBotBadge />);
    expect(screen.getByText(/Explore com o/)).toBeInTheDocument();
  });

  it("uses the light theme palette when resolvedTheme is light", () => {
    state.resolvedTheme = "light";
    render(<EpidBotBadge />);
    const link = screen.getByRole("link");
    expect(link.style.background).toBe("rgb(255, 255, 255)");
  });
});
