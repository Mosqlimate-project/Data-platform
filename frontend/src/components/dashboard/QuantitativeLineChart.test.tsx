import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { LineChart } from "./QuantitativeLineChart";
import type { QuantitativePrediction, Series } from "./QuantitativeLineChart";

const mocks = vi.hoisted(() => {
  const instance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
    getDom: vi.fn(),
  };
  return { instance, init: vi.fn(() => instance) };
});

const theme = vi.hoisted(() => ({ resolvedTheme: "light" }));

vi.mock("echarts", () => ({ init: mocks.init }));
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: theme.resolvedTheme,
    resolvedTheme: theme.resolvedTheme,
    setTheme: vi.fn(),
  }),
}));

const observed: Series = {
  labels: [new Date("2024-01-01"), new Date("2024-01-02")],
  data: [10, null],
};

const prediction: QuantitativePrediction = {
  id: 7,
  color: "#123456",
  data: {
    labels: [new Date("2024-01-02"), new Date("2024-01-03")],
    data: [5, 6],
    lower_50: [4, 5],
    upper_50: [6, 7],
    lower_90: [3, 4],
    upper_90: [7, 8],
  },
};

function lastOptions() {
  return mocks.instance.setOption.mock.calls.at(-1)![0];
}

describe("components/dashboard/QuantitativeLineChart", () => {
  beforeEach(() => {
    theme.resolvedTheme = "light";
    mocks.instance.setOption.mockClear();
    mocks.instance.resize.mockClear();
    mocks.instance.dispose.mockClear();
    mocks.init.mockClear();
    mocks.init.mockReturnValue(mocks.instance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes echarts and renders the container with default size", () => {
    const { container } = render(
      <LineChart data={{ labels: [], data: [] }} predictions={[]} />
    );
    expect(mocks.init).toHaveBeenCalledTimes(1);
    const div = container.querySelector("div") as HTMLDivElement;
    expect(div.style.width).toBe("100%");
    expect(div.style.height).toBe("400px");
  });

  it("adds an observed series when data is present", () => {
    render(
      <LineChart data={observed} predictions={[prediction]} dataSeriesName="Cases" />
    );
    const series = lastOptions().series as Array<{ name: string }>;
    expect(series.some((s) => s.name === "Cases")).toBe(true);
    const legend = lastOptions().legend as { data: Array<{ name: string }> };
    expect(legend.data.some((d) => d.name === "Cases")).toBe(true);
  });

  it("omits the observed series when all values are null", () => {
    render(
      <LineChart
        data={{ labels: [new Date("2024-01-01")], data: [null] }}
        predictions={[prediction]}
      />
    );
    const series = lastOptions().series as Array<{ name: string }>;
    expect(series.some((s) => s.name === "Data")).toBe(false);
  });

  it("adds confidence bands for globally enabled intervals", () => {
    render(
      <LineChart
        data={{ labels: [], data: [] }}
        predictions={[prediction]}
        globalIntervals={new Set(["50", "90"])}
        visibleBounds={new Set([7])}
      />
    );
    const names = (lastOptions().series as Array<{ name: string }>).map((s) => s.name);
    expect(names).toContain("7");
    expect(names).toContain("7_50_base");
    expect(names).toContain("7_50_area");
    expect(names).toContain("7_90_base");
    expect(names).toContain("7_90_area");
    expect(names).not.toContain("7_80_base");
  });

  it("supports string ids in visibleBounds", () => {
    render(
      <LineChart
        data={{ labels: [], data: [] }}
        predictions={[prediction]}
        globalIntervals={new Set(["50"])}
        visibleBounds={new Set(["7"])}
      />
    );
    const names = (lastOptions().series as Array<{ name: string }>).map((s) => s.name);
    expect(names).toContain("7_50_area");
  });

  it("skips bands when interval arrays are missing", () => {
    const partial: QuantitativePrediction = {
      id: 1,
      color: "#000",
      data: { labels: [new Date("2024-01-01")], data: [1] },
    };
    render(
      <LineChart
        data={{ labels: [], data: [] }}
        predictions={[partial]}
        globalIntervals={new Set(["50", "80", "90", "95"])}
        visibleBounds={new Set([1])}
      />
    );
    const names = (lastOptions().series as Array<{ name: string }>).map((s) => s.name);
    expect(names).not.toContain("1_50_area");
    expect(names).toContain("1");
  });

  it("produces null deltas when bounds are not numbers", () => {
    const nullish: QuantitativePrediction = {
      id: 2,
      color: "#000",
      data: {
        labels: [new Date("2024-01-01")],
        data: [1],
        lower_50: [null],
        upper_50: [5],
      },
    };
    render(
      <LineChart
        data={{ labels: [], data: [] }}
        predictions={[nullish]}
        globalIntervals={new Set(["50"])}
        visibleBounds={new Set([2])}
      />
    );
    const area = (lastOptions().series as Array<{ name: string; data: unknown[] }>).find(
      (s) => s.name === "2_50_area"
    )!;
    expect(area.data).toEqual([null]);
  });

  it("handles non-Date labels", () => {
    render(
      <LineChart
        data={{ labels: ["2024-01-05" as unknown as Date], data: [1] }}
        predictions={[]}
      />
    );
    const xAxis = lastOptions().xAxis as { data: string[] };
    expect(xAxis.data).toContain("2024-01-05");
  });

  it("uses dark theme colors when resolvedTheme is dark", () => {
    theme.resolvedTheme = "dark";
    render(
      <LineChart
        data={observed}
        predictions={[prediction]}
        globalIntervals={new Set(["50"])}
        visibleBounds={new Set([7])}
      />
    );
    const options = lastOptions();
    expect((options.tooltip as { backgroundColor: string }).backgroundColor).toBe("#1f2937");
    const observedSeries = (options.series as Array<{ name: string; itemStyle: { color: string } }>).find(
      (s) => s.name === "Data"
    )!;
    expect(observedSeries.itemStyle.color).toBe("#ffffff");
  });

  it("resizes on window resize and cleans up the listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(
      <LineChart data={observed} predictions={[prediction]} />
    );
    mocks.instance.resize.mockClear();
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(mocks.instance.resize).toHaveBeenCalled();
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });

  it("respects custom width and height", () => {
    const { container } = render(
      <LineChart
        data={{ labels: [], data: [] }}
        predictions={[]}
        width="50%"
        height={300}
      />
    );
    const div = container.querySelector("div") as HTMLDivElement;
    expect(div.style.width).toBe("50%");
    expect(div.style.height).toBe("300px");
  });
});
