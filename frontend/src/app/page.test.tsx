import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  default: () => () => null,
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

describe("app/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMetadata.mockResolvedValue(metadata);
    window.scrollBy = vi.fn();
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
});
