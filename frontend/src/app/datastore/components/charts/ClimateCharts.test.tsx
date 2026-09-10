import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { AccumulatedWaterfallChart, TemperatureChart, AirChart } from "./ClimateCharts";

const echartsMock = vi.hoisted(() => {
  const instance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    getDom: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  };
  return {
    instance,
    init: vi.fn(() => instance),
    registerMap: vi.fn(),
    getInstanceByDom: vi.fn(() => null),
  };
});

vi.mock("echarts", () => ({
  init: echartsMock.init,
  graphic: { LinearGradient: class {} },
  registerMap: echartsMock.registerMap,
  getInstanceByDom: echartsMock.getInstanceByDom,
}));

const i18nMock = vi.hoisted(() => {
  const t = (key: string) => key;
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const theme = vi.hoisted(() => ({ resolvedTheme: "light" }));
vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: theme.resolvedTheme,
    resolvedTheme: theme.resolvedTheme,
    setTheme: vi.fn(),
    themes: ["light", "dark"],
  }),
}));

const chartData = [
  { date: "2024-01-01 00:00", precip_tot: 5, precip_med: 2.5, temp_min: 1, temp_med: 2, temp_max: 3, umid_med: 80, pressao_med: 1.01 },
  { date: "2024-01-02 00:00", precip_tot: 3, precip_med: 1.5, temp_min: 2, temp_med: 3, temp_max: 4, umid_med: 81, pressao_med: 1.02 },
];

function mockFetch(overrides: { chartOk?: boolean; cityOk?: boolean; chart?: unknown } = {}) {
  global.fetch = vi.fn((input: any) => {
    const url = String(input);
    if (url.includes("/cities")) {
      return Promise.resolve({
        ok: overrides.cityOk ?? true,
        json: async () => [{ name: "Rio", adm1: "RJ" }],
      });
    }
    return Promise.resolve({
      ok: overrides.chartOk ?? true,
      json: async () => (overrides.chart !== undefined ? overrides.chart : chartData),
    });
  }) as unknown as typeof fetch;
}

function lastOption() {
  const calls = echartsMock.instance.setOption.mock.calls;
  return calls.length ? (calls[calls.length - 1][0] as any) : null;
}

async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 30));
}

describe("datastore/components/charts/ClimateCharts", () => {
  beforeEach(() => {
    theme.resolvedTheme = "light";
    vi.clearAllMocks();
    echartsMock.init.mockImplementation(() => echartsMock.instance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not fetch when required props are missing", () => {
    mockFetch();
    render(<TemperatureChart geocode="" start="" end="" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch for the waterfall chart when props are missing", () => {
    mockFetch();
    render(<AccumulatedWaterfallChart geocode="" start="" end="" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("does not fetch for the air chart when props are missing", () => {
    mockFetch();
    render(<AirChart geocode="" start="" end="" />);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("renders the temperature chart with city location", async () => {
    mockFetch();
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect(option.title.text).toBe("charts_climate.temp_title");
    expect(option.series).toHaveLength(3);
  });

  it("falls back to the geocode when the city request fails", async () => {
    mockFetch({ cityOk: false });
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    expect(lastOption().title.text).toBe("charts_climate.temp_title");
  });

  it("handles an empty city list", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/cities")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => chartData });
    }) as unknown as typeof fetch;
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    expect(lastOption().title.text).toBe("charts_climate.temp_title");
  });

  it("does not set options when the chart response is empty", async () => {
    mockFetch({ chart: [] });
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await flush();
    expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
  });

  it("does not set options for the waterfall chart when the response is empty", async () => {
    mockFetch({ chart: [] });
    render(<AccumulatedWaterfallChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await flush();
    expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
  });

  it("does not set options for the air chart when the response is empty", async () => {
    mockFetch({ chart: [] });
    render(<AirChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await flush();
    expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
  });

  it("logs an error when the chart response is not ok", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ chartOk: false });
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs an error for the waterfall chart when the response is not ok", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ chartOk: false });
    render(<AccumulatedWaterfallChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs an error for the air chart when the response is not ok", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ chartOk: false });
    render(<AirChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs an error when fetch rejects", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs an error when the waterfall fetch rejects", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<AccumulatedWaterfallChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs an error when the air fetch rejects", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<AirChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("renders the accumulated waterfall chart and exercises the tooltip formatter", async () => {
    mockFetch();
    render(<AccumulatedWaterfallChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    const formatter = lastOption().tooltip.formatter;
    const whole = formatter([
      { axisValueLabel: "d1", marker: "m", seriesName: "s", data: 5 },
      { axisValueLabel: "d1", marker: "m", seriesName: "s2", data: 2.5 },
    ]);
    expect(whole).toContain("5");
    expect(whole).toContain("2.5");
  });

  it("renders the air chart with dual axes", async () => {
    mockFetch();
    render(<AirChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    const option = lastOption();
    expect(option.series).toHaveLength(2);
    expect(option.yAxis).toHaveLength(2);
  });

  it("uses dark theme colors when the theme is dark", async () => {
    theme.resolvedTheme = "dark";
    mockFetch();
    render(<AirChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    expect(lastOption().title.textStyle.color).toBe("#ffffff");
  });

  it("invokes the air chart yAxis max function", async () => {
    mockFetch();
    render(<AirChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    expect(lastOption().yAxis[0].max({ max: 1.01 })).toBeCloseTo(1.03);
  });

  it("renders the waterfall chart in dark theme", async () => {
    theme.resolvedTheme = "dark";
    mockFetch();
    render(<AccumulatedWaterfallChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    expect(lastOption().title.textStyle.color).toBe("#ffffff");
    expect(lastOption().tooltip.backgroundColor).toBe("#1f2937");
    expect(lastOption().dataZoom[1].backgroundColor).toBe("#1f2937");
  });

  it("renders the temperature chart in dark theme", async () => {
    theme.resolvedTheme = "dark";
    mockFetch();
    render(<TemperatureChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
    await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
    expect(lastOption().title.textStyle.color).toBe("#ffffff");
    expect(lastOption().legend.textStyle.color).toBe("#ffffff");
  });
});
