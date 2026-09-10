import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DatastorePage from "./page";

const nav = vi.hoisted(() => ({ search: "", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
  usePathname: () => "/datastore",
}));

vi.mock("./views/ClimateView", () => ({ ClimateView: () => <div data-testid="climate" /> }));
vi.mock("./views/InfodengueView", () => ({ InfodengueView: () => <div data-testid="infodengue" /> }));
vi.mock("./views/ContaovosView", () => ({ ContaovosView: () => <div data-testid="contaovos" /> }));
vi.mock("./views/EpiscannerView", () => ({ EpiScannerView: () => <div data-testid="episcanner" /> }));
vi.mock("./views/VegetationView", () => ({ VegetationView: () => <div data-testid="vegetation" /> }));
vi.mock("@/components/EpidBotBadge", () => ({ default: () => <div data-testid="epidbot" /> }));

const dataMock = vi.hoisted(() => ({ override: null as any }));
vi.mock("./data", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./data")>();
  return {
    ...actual,
    getEndpoints: (t: (key: string) => string) =>
      dataMock.override !== null ? dataMock.override : actual.getEndpoints(t),
  };
});

describe("app/datastore/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.search = "";
    dataMock.override = null;
  });

  it("defaults to the infodengue view", () => {
    render(<DatastorePage />);
    expect(screen.getByTestId("infodengue")).toBeInTheDocument();
    expect(screen.getByText("Datastore")).toBeInTheDocument();
    expect(screen.getByTestId("epidbot")).toBeInTheDocument();
  });

  it.each([
    ["climate", "climate"],
    ["vegetation", "vegetation"],
    ["mosquito", "contaovos"],
    ["episcanner", "episcanner"],
  ])("renders the %s endpoint", (param, testId) => {
    nav.search = `endpoint=${param}`;
    render(<DatastorePage />);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it("falls back to the first endpoint for unknown params", () => {
    nav.search = "endpoint=unknown";
    render(<DatastorePage />);
    expect(screen.getByTestId("infodengue")).toBeInTheDocument();
  });

  it("navigates when a card is clicked", () => {
    render(<DatastorePage />);
    fireEvent.click(screen.getByText("datastore.climate.title"));
    expect(nav.push).toHaveBeenCalledWith("?endpoint=climate", { scroll: false });
  });

  it("does not navigate when the more info link is clicked", () => {
    render(<DatastorePage />);
    fireEvent.click(screen.getAllByText("More info →")[0]);
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("renders the unknown endpoint fallback", () => {
    dataMock.override = [
      {
        endpoint: "/unknown/",
        name: "X",
        description: "d",
        source: "s",
        more_info_link: "m",
        tags: ["t"],
        data_variables: [],
        chart_options: [],
      },
    ];
    render(<DatastorePage />);
    expect(screen.getByText("Unknown Endpoint")).toBeInTheDocument();
  });

  it("renders nothing when there are no endpoints", () => {
    dataMock.override = [];
    render(<DatastorePage />);
    expect(screen.getByText("Datastore")).toBeInTheDocument();
    expect(screen.queryByTestId("infodengue")).not.toBeInTheDocument();
  });
});
