import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AboutPage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("@/components/NetworkBackground", () => ({ default: () => null }));

describe("app/about/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.scrollBy = vi.fn();
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the team page", () => {
    render(<AboutPage />);
    expect(screen.getByText("about.title")).toBeInTheDocument();
    expect(screen.getByText("Flávio Codeço Coelho")).toBeInTheDocument();
    expect(screen.getByText("Raquel Martins Lana")).toBeInTheDocument();
    expect(screen.getAllByText("about.roles.coordination").length).toBeGreaterThan(0);
    expect(screen.getAllByAltText("LinkedIn").length).toBe(21);
    expect(screen.getAllByAltText("Lattes").length).toBe(21);
  });

  it("renders the scroll indicator and scrolls on click", () => {
    render(<AboutPage />);
    const indicator = screen.getByText("home.scroll");
    fireEvent.click(indicator);
    expect(window.scrollBy).toHaveBeenCalledWith({ top: expect.any(Number), behavior: "smooth" });
  });

  it("hides the scroll indicator at the bottom of the page", () => {
    Object.defineProperty(window, "scrollY", { value: 4800, configurable: true });
    render(<AboutPage />);
    fireEvent.scroll(window);
    expect(screen.queryByText("home.scroll")).not.toBeInTheDocument();
  });

  it("reveals sections when they intersect the viewport", () => {
    let callback: ((entries: any[]) => void) | null = null;
    window.IntersectionObserver = class {
      constructor(cb: (entries: any[]) => void) {
        callback = cb;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    const { container } = render(<AboutPage />);
    const section = container.querySelector(".opacity-0");
    expect(section).toBeInTheDocument();
    act(() => {
      callback?.([{ isIntersecting: true }]);
    });
    expect(container.querySelector(".opacity-100")).toBeInTheDocument();
  });
});
