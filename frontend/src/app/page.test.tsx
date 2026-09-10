import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import HomePage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("next/dynamic", () => ({
  __esModule: true,
  default: (loader: () => any) => {
    loader();
    return () => null;
  },
}));

const fetchMetadata = vi.hoisted(() => vi.fn());
vi.mock("@/lib/dashboard/api", () => ({ fetchPredictionMetadata: fetchMetadata }));

const homeChart = vi.hoisted(() => ({ props: null as any }));
vi.mock("@/components/HomeChart", () => ({
  default: (props: any) => {
    homeChart.props = props;
    return <div data-testid="home-chart" />;
  },
}));

const metadata = {
  id: 4415,
  disease_code: "A90",
  adm_level: 2,
  case_definition: "reported",
  adm_0_code: null,
  adm_1_code: null,
  adm_2_code: "3304557",
  sprint: true,
};

let ioCallbacks: Array<(entries: any[]) => void> = [];

describe("app/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMetadata.mockResolvedValue(metadata);
    window.scrollBy = vi.fn();
    ioCallbacks = [];
    window.IntersectionObserver = class {
      constructor(cb: (entries: any[]) => void) {
        ioCallbacks.push(cb);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("renders the landing sections", () => {
    render(<HomePage />);
    expect(screen.getByText("home.hero.title")).toBeInTheDocument();
    expect(screen.getByText("home.project.title")).toBeInTheDocument();
    expect(screen.getByText("home.data.title")).toBeInTheDocument();
    expect(screen.getByText("home.models.title")).toBeInTheDocument();
    expect(screen.getByText("Episcanner")).toBeInTheDocument();
    expect(screen.getByText("home.differentials.title")).toBeInTheDocument();
  });

  it("renders the home chart and dashboard link once metadata is loaded", async () => {
    render(<HomePage />);
    await waitFor(() => expect(screen.getByTestId("home-chart")).toBeInTheDocument());

    expect(homeChart.props.predictionId).toBe(4415);
    const link = screen.getByRole("link", { name: /home.models.image_message/ });
    expect(link.getAttribute("href")).toContain("sprint=true");
    expect(link.getAttribute("href")).toContain("adm_level=2");
    expect(link.getAttribute("href")).toContain("adm_2=3304557");
  });

  it("logs an error when the metadata fetch fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMetadata.mockRejectedValue(new Error("boom"));
    render(<HomePage />);
    await waitFor(() => expect(err).toHaveBeenCalled());
    expect(screen.queryByTestId("home-chart")).not.toBeInTheDocument();
  });

  it("fades sections in when they intersect", () => {
    render(<HomePage />);
    const sections = document.querySelectorAll("[data-scroll-section]");
    expect(sections.length).toBeGreaterThan(0);
    act(() => {
      ioCallbacks[0]([{ isIntersecting: true }]);
    });
    expect(ioCallbacks.length).toBeGreaterThan(0);
  });

  it("scrolls to the next section when the scroll indicator is clicked", () => {
    render(<HomePage />);
    const indicator = screen.getByText("home.scroll").closest("div")!;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-scroll-section]"));
    Object.defineProperty(sections[0], "offsetTop", { value: 100, configurable: true });
    fireEvent.click(indicator);
    expect(window.HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("does not scroll when there is no section below the fold", () => {
    render(<HomePage />);
    const indicator = screen.getByText("home.scroll").closest("div")!;
    fireEvent.click(indicator);
    expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  });

  it("hides the scroll indicator when the page is fully scrolled", () => {
    render(<HomePage />);
    expect(screen.getByText("home.scroll")).toBeInTheDocument();
    act(() => {
      fireEvent.scroll(window);
    });
    expect(screen.queryByText("home.scroll")).not.toBeInTheDocument();
  });

  it("uses the production prediction id when NODE_ENV is production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { default: ProdHome } = await import("./page");
    render(<ProdHome />);
    await waitFor(() => expect(fetchMetadata).toHaveBeenCalledWith("2085"));
  });

  it("builds the dashboard link for adm_level 0 with an adm_0 code", async () => {
    fetchMetadata.mockResolvedValue({
      ...metadata,
      adm_level: 0,
      adm_0_code: "BRA",
      adm_1_code: null,
      adm_2_code: null,
      sprint: false,
    });
    render(<HomePage />);
    await waitFor(() => expect(screen.getByTestId("home-chart")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /home.models.image_message/ });
    expect(link.getAttribute("href")).toContain("sprint=false");
    expect(link.getAttribute("href")).toContain("adm_0=BRA");
  });

  it("builds the dashboard link for adm_level 1 with an adm_1 code", async () => {
    fetchMetadata.mockResolvedValue({
      ...metadata,
      adm_level: 1,
      adm_0_code: "BRA",
      adm_1_code: "33",
      adm_2_code: null,
    });
    render(<HomePage />);
    await waitFor(() => expect(screen.getByTestId("home-chart")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /home.models.image_message/ });
    expect(link.getAttribute("href")).toContain("adm_1=33");
  });

  it("builds a dashboard link without codes when codes are missing", async () => {
    fetchMetadata.mockResolvedValue({
      ...metadata,
      adm_level: 1,
      adm_0_code: null,
      adm_1_code: null,
      adm_2_code: null,
    });
    render(<HomePage />);
    await waitFor(() => expect(screen.getByTestId("home-chart")).toBeInTheDocument());
    const link = screen.getByRole("link", { name: /home.models.image_message/ });
    expect(link.getAttribute("href")).not.toContain("adm_0=");
    expect(link.getAttribute("href")).not.toContain("adm_1=");
    expect(link.getAttribute("href")).not.toContain("adm_2=");
  });

  it("links to the base dashboard before metadata loads", () => {
    let resolveFn: (v: any) => void;
    fetchMetadata.mockReturnValue(
      new Promise((resolve) => {
        resolveFn = resolve;
      })
    );
    render(<HomePage />);
    expect(screen.queryByRole("link", { name: /home.models.image_message/ })).not.toBeInTheDocument();
    act(() => resolveFn!(metadata));
  });
});
