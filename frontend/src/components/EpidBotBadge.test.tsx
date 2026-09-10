import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EpidBotBadge from "./EpidBotBadge";

vi.mock("react-i18next", async (importOriginal) => {
  const original = await importOriginal<typeof import("react-i18next")>();
  return {
    ...original,
    useTranslation: () => ({
      i18n: { language: "en" },
      t: (k: string) => k,
    }),
  };
});

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "dark",
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

describe("EpidBotBadge", () => {
  beforeEach(() => {
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
});
