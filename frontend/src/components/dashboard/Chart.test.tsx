import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardChart from "./Chart";

vi.mock("@/components/dashboard/QuantitativeLineChart", () => ({
  LineChart: (props: {
    dataSeriesName?: string;
    height?: string | number;
    globalIntervals?: Set<string>;
    visibleBounds?: Set<number>;
  }) => (
    <div
      data-testid="line-chart"
      data-series-name={props.dataSeriesName}
      data-height={props.height}
      data-intervals={Array.from(props.globalIntervals ?? []).join(",")}
      data-bounds={Array.from(props.visibleBounds ?? []).join(",")}
    />
  ),
}));

const baseProps = {
  disease: "A90",
  sprint: false,
  caseDefinition: "reported",
  chartData: { labels: [], data: [] },
  chartPredictions: [],
  globalIntervals: new Set(["50", "90"]),
  visibleBounds: new Set<number>(),
  isHistoricalLoading: false,
};

describe("components/dashboard/Chart", () => {
  it("renders the line chart when a disease is selected", () => {
    render(<DashboardChart {...baseProps} />);
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(screen.queryByText("dashboard.chart.select_disease")).not.toBeInTheDocument();
  });

  it("shows the empty state when no disease is selected", () => {
    render(<DashboardChart {...baseProps} disease="" />);
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
    expect(screen.getByText("dashboard.chart.select_disease")).toBeInTheDocument();
  });

  it("shows the loading overlay when historical data is loading", () => {
    const { container } = render(
      <DashboardChart {...baseProps} isHistoricalLoading />
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("uses the probable cases series name in sprint mode", () => {
    render(<DashboardChart {...baseProps} sprint />);
    expect(screen.getByTestId("line-chart")).toHaveAttribute(
      "data-series-name",
      "dashboard.chart.probable_cases"
    );
  });

  it("builds a probable series name for probable case definitions", () => {
    render(<DashboardChart {...baseProps} caseDefinition="probable" />);
    expect(screen.getByTestId("line-chart")).toHaveAttribute(
      "data-series-name",
      "dashboard.filters.probable dashboard.chart.cases"
    );
  });

  it("builds a reported series name for reported case definitions", () => {
    render(<DashboardChart {...baseProps} caseDefinition="reported" />);
    expect(screen.getByTestId("line-chart")).toHaveAttribute(
      "data-series-name",
      "dashboard.filters.reported dashboard.chart.cases"
    );
  });

  it("forwards intervals, bounds and height to the chart", () => {
    render(
      <DashboardChart
        {...baseProps}
        globalIntervals={new Set(["80"])}
        visibleBounds={new Set([3])}
      />
    );
    const chart = screen.getByTestId("line-chart");
    expect(chart).toHaveAttribute("data-intervals", "80");
    expect(chart).toHaveAttribute("data-bounds", "3");
    expect(chart).toHaveAttribute("data-height", "100%");
  });
});
