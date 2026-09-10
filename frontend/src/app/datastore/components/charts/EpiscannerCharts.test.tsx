import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EpiScannerChart } from "./EpiscannerCharts";

const theme = vi.hoisted(() => ({ resolvedTheme: "light" }));
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: theme.resolvedTheme,
    resolvedTheme: theme.resolvedTheme,
    setTheme: vi.fn(),
    themes: ["light", "dark"],
  }),
}));

const geos = [
  { rsmKey: "1", properties: { geocode: "33", name: "Rio" } },
  { rsmKey: "2", id: "99", properties: {} },
];

vi.mock("react-simple-maps", () => ({
  ComposableMap: ({ children }: any) => <div data-testid="composable-map">{children}</div>,
  ZoomableGroup: ({ children }: any) => <div>{children}</div>,
  Geographies: ({ children }: any) => <>{children({ geographies: geos })}</>,
  Geography: (props: any) => (
    <div
      data-testid="geography"
      data-fill={String(props.fill)}
      onMouseMove={props.onMouseMove}
      onMouseLeave={props.onMouseLeave}
    />
  ),
}));

describe("datastore/components/charts/EpiscannerCharts", () => {
  beforeEach(() => {
    theme.resolvedTheme = "light";
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a loading placeholder when geoData is missing", () => {
    render(<EpiScannerChart geoData={null} data={[]} selectedUf="SP" />);
    expect(screen.getByText("Loading Map for SP...")).toBeInTheDocument();
  });

  it("renders the map with data and fires hover/leave handlers", () => {
    const onHover = vi.fn();
    const onLeave = vi.fn();
    render(
      <EpiScannerChart
        geoData={{}}
        data={[{ id: "33", value: 5, name: "Rio" }]}
        selectedUf="SP"
        onHover={onHover}
        onLeave={onLeave}
      />
    );

    const geographies = screen.getAllByTestId("geography");
    expect(geographies).toHaveLength(2);

    fireEvent.mouseMove(geographies[0], { clientX: 10, clientY: 20 });
    expect(onHover).toHaveBeenCalledWith("Rio", 5, 10, 20);

    fireEvent.mouseMove(geographies[1], { clientX: 1, clientY: 2 });
    expect(onHover).toHaveBeenCalledWith("Unknown", "-", 1, 2);

    fireEvent.mouseLeave(geographies[0]);
    expect(onLeave).toHaveBeenCalled();
  });

  it("does not throw when hover handlers are omitted", () => {
    render(<EpiScannerChart geoData={{}} data={[{ id: "33", value: 5 }]} selectedUf="SP" />);
    fireEvent.mouseMove(screen.getAllByTestId("geography")[0], { clientX: 1, clientY: 2 });
    fireEvent.mouseLeave(screen.getAllByTestId("geography")[0]);
    expect(screen.getAllByTestId("geography")).toHaveLength(2);
  });

  it("handles empty data and an unknown UF", () => {
    render(<EpiScannerChart geoData={{}} data={[]} selectedUf="XX" />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("uses a lowercase UF through the projection config", () => {
    render(<EpiScannerChart geoData={{}} data={[{ id: "33", value: 5 }]} selectedUf="sp" />);
    expect(screen.getByTestId("composable-map")).toBeInTheDocument();
  });

  it("renders dark theme styles", () => {
    theme.resolvedTheme = "dark";
    render(<EpiScannerChart geoData={{}} data={[]} selectedUf="SP" />);
    const geographies = screen.getAllByTestId("geography");
    expect(geographies[1].getAttribute("data-fill")).toBe("#1e293b");
  });
});
