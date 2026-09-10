import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { TotalCases, DailyCasesChart, RtChart } from "./InfodengueCharts";

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
  return { instance, init: vi.fn(() => instance) };
});

vi.mock("echarts", () => ({
  init: echartsMock.init,
  graphic: { LinearGradient: class {} },
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

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const dailyData = [
  { date: "2024-01-02", cases: 5 },
  { date: "2024-01-01", cases: 2 },
];
const rtData = [
  { data_iniSE: "2024-01-02", Rt: 1.4 },
  { data_iniSE: "2024-01-01", Rt: 0.8 },
];

function mockFetch(overrides: {
  total?: unknown;
  totalOk?: boolean;
  daily?: unknown;
  dailyOk?: boolean;
  rt?: unknown;
  rtOk?: boolean;
  reject?: boolean;
} = {}) {
  global.fetch = vi.fn((input: any) => {
    const url = String(input);
    if (overrides.reject) return Promise.reject(new Error("boom"));
    if (url.includes("/total-cases/"))
      return Promise.resolve({ ok: overrides.totalOk ?? true, json: async () => overrides.total ?? { total_cases: 1234 } });
    if (url.includes("/vis/dashboard/cases/"))
      return Promise.resolve({ ok: overrides.dailyOk ?? true, json: async () => overrides.daily ?? dailyData });
    if (url.includes("/infodengue/rt/"))
      return Promise.resolve({ ok: overrides.rtOk ?? true, json: async () => overrides.rt ?? rtData });
    return Promise.resolve({ ok: true, json: async () => [] });
  }) as unknown as typeof fetch;
}

function lastOption() {
  const calls = echartsMock.instance.setOption.mock.calls;
  return calls.length ? (calls[calls.length - 1][0] as any) : null;
}

describe("datastore/components/charts/InfodengueCharts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    theme.resolvedTheme = "light";
    echartsMock.init.mockImplementation(() => echartsMock.instance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("TotalCases", () => {
    it("does not fetch without a geocode", () => {
      mockFetch();
      render(<TotalCases geocode="" disease="dengue" start="a" end="b" />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("renders the total cases", async () => {
      mockFetch();
      render(<TotalCases geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(screen.getByText("1,234")).toBeInTheDocument());
    });

    it("ignores responses without total_cases", async () => {
      mockFetch({ total: {} });
      render(<TotalCases geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    it("logs fetch errors", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ reject: true });
      render(<TotalCases geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });
  });

  describe("DailyCasesChart", () => {
    it("does not fetch when props are missing", () => {
      mockFetch();
      render(<DailyCasesChart geocode="" disease="" start="" end="" />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it.each([
      ["dengue", "A90"],
      ["zika", "A92.5"],
      ["chikungunya", "A92.0"],
      ["other", "A90"],
    ])("maps %s to %s", async (disease, code) => {
      mockFetch();
      render(<DailyCasesChart geocode="33" disease={disease} start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(String((global.fetch as any).mock.calls[0][0])).toContain(`disease=${code}`);
    });

    it("renders the chart and tooltip formatter", async () => {
      mockFetch();
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      const formatter = lastOption().tooltip.formatter;
      const html = formatter([{ axisValue: "2024-01-01", marker: "m", seriesName: "s", value: 5 }]);
      expect(html).toContain("5");
    });

    it("formats the daily cases x axis labels", async () => {
      mockFetch();
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      const formatter = lastOption().xAxis.axisLabel.formatter;
      expect(formatter("2024-01-01T00:00:00")).toBe("2024-01-01");
    });

    it("resizes the chart instance on window resize while loading", async () => {
      let resolveFetch: (v: any) => void;
      global.fetch = vi.fn().mockReturnValue(
        new Promise((res) => {
          resolveFetch = res;
        })
      ) as unknown as typeof fetch;
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.init).toHaveBeenCalled());
      const callsBefore = echartsMock.instance.resize.mock.calls.length;
      act(() => {
        window.dispatchEvent(new Event("resize"));
      });
      expect(echartsMock.instance.resize.mock.calls.length).toBeGreaterThan(callsBefore);
      await act(async () => {
        resolveFetch!({ ok: true, json: async () => dailyData });
        await Promise.resolve();
        await Promise.resolve();
      });
    });

    it("renders in dark theme", async () => {
      theme.resolvedTheme = "dark";
      mockFetch();
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect(lastOption().title.textStyle.color).toBe("#ffffff");
      expect(lastOption().tooltip.backgroundColor).toBe("#1f2937");
      expect(lastOption().xAxis.axisLabel.color).toBe("#9ca3af");
    });

    it("handles empty data", async () => {
      mockFetch({ daily: [] });
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 30));
      expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
    });

    it("handles a non-ok response", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ dailyOk: false });
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });

    it("handles a rejected fetch", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ reject: true });
      render(<DailyCasesChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });
  });

  describe("RtChart", () => {
    it("does not fetch when props are missing", () => {
      mockFetch();
      render(<RtChart geocode="33" disease="" start="2024-01-01" end="2024-02-01" />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("renders the chart and tooltip formatter", async () => {
      mockFetch();
      render(<RtChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      const formatter = lastOption().tooltip.formatter;
      const html = formatter([{ axisValue: "2024-01-01", value: 1.4 }]);
      expect(html).toContain("1.40");
    });

    it("formats the rt x axis labels", async () => {
      mockFetch();
      render(<RtChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      const formatter = lastOption().xAxis.axisLabel.formatter;
      expect(formatter("2024-01-02T00:00:00")).toBe("2024-01-02");
    });

    it("renders in dark theme", async () => {
      theme.resolvedTheme = "dark";
      mockFetch();
      render(<RtChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect(lastOption().title.textStyle.color).toBe("#ffffff");
      expect(lastOption().series[0].markLine.lineStyle.color).toBe("#9ca3af");
    });

    it("handles empty data", async () => {
      mockFetch({ rt: [] });
      render(<RtChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 30));
      expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
    });

    it("handles a rejected fetch", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ reject: true });
      render(<RtChart geocode="33" disease="dengue" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });
  });
});
