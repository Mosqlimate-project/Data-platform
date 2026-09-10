import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import {
  EggsDensityChart,
  PositivityChart,
  MapChart,
  EggCountChart,
} from "./ContaovosCharts";

const echartsMock = vi.hoisted(() => {
  const handlers: Record<string, (p: any) => void> = {};
  const instance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    showLoading: vi.fn(),
    hideLoading: vi.fn(),
    clear: vi.fn(),
    dispose: vi.fn(),
    getDom: vi.fn(),
    on: vi.fn((evt: string, cb: (p: any) => void) => {
      handlers[evt] = cb;
    }),
    off: vi.fn(),
  };
  return {
    instance,
    handlers,
    init: vi.fn(() => instance),
    registerMap: vi.fn(),
    getInstanceByDom: vi.fn(() => instance),
  };
});

vi.mock("echarts", () => ({
  init: echartsMock.init,
  graphic: { LinearGradient: class {} },
  registerMap: echartsMock.registerMap,
  getInstanceByDom: echartsMock.getInstanceByDom,
}));

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const eggsData = [
  { epiweek: "202401", total_eggs: 10 },
  { epiweek: "202402", total_eggs: 20 },
];
const positivityData = [
  { name: "A", positivity: 0.5 },
  { name: "B", positivity: 0.75 },
];
const mapData = [
  { name: "SP", total_eggs: 10, trap_count: 2, municipality_count: 1 },
  { name: "RJ", total_eggs: 5, trap_count: 1, municipality_count: 1 },
];
const scatterData = [
  { name: "SP", longitude: -46, latitude: -23, trap_id: "t1", municipality: "Sao Paulo" },
  { name: "SP", longitude: -46.1, latitude: -23.1, trap_id: "t2", municipality: "Sao Paulo" },
];

function mockFetch(overrides: { eggs?: unknown; positivity?: unknown; map?: unknown; scatter?: unknown; fail?: boolean } = {}) {
  global.fetch = vi.fn((input: any) => {
    const url = String(input);
    if (overrides.fail) return Promise.reject(new Error("boom"));
    if (url.includes("/map/scatter/")) return Promise.resolve({ ok: true, json: async () => overrides.scatter ?? scatterData });
    if (url.includes("/map/")) return Promise.resolve({ ok: true, json: async () => overrides.map ?? mapData });
    if (url.includes("/eggs-density/")) return Promise.resolve({ ok: true, json: async () => overrides.eggs ?? eggsData });
    if (url.includes("/positivity/")) return Promise.resolve({ ok: true, json: async () => overrides.positivity ?? positivityData });
    return Promise.resolve({ ok: true, json: async () => [] });
  }) as unknown as typeof fetch;
}

function lastOption() {
  const calls = echartsMock.instance.setOption.mock.calls;
  return calls.length ? (calls[calls.length - 1][0] as any) : null;
}

describe("datastore/components/charts/ContaovosCharts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    echartsMock.init.mockImplementation(() => echartsMock.instance);
    echartsMock.getInstanceByDom.mockImplementation(() => echartsMock.instance);
    delete echartsMock.handlers.click;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("EggsDensityChart", () => {
    it("does not fetch without dates", () => {
      mockFetch();
      render(<EggsDensityChart start="" end="" />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("uses the uf parameter and renders", async () => {
      mockFetch();
      render(<EggsDensityChart uf="SP" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect((global.fetch as any).mock.calls[0][0]).toContain("uf=SP");
      expect(lastOption().series).toHaveLength(1);
    });

    it("uses the geocode parameter", async () => {
      mockFetch();
      render(<EggsDensityChart geocode="3304557" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect((global.fetch as any).mock.calls[0][0]).toContain("geocode=3304557");
    });

    it("uses the brazil fallback and 2-letter geocode", async () => {
      mockFetch();
      render(<EggsDensityChart geocode="rj" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect(lastOption().title.text).toBe("charts_contaovos.eggs_density_title");
    });

    it("handles empty data", async () => {
      mockFetch({ eggs: [] });
      render(<EggsDensityChart uf="SP" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 30));
      expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
    });

    it("handles fetch rejection", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ fail: true });
      render(<EggsDensityChart uf="SP" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });
  });

  describe("PositivityChart", () => {
    it("does not fetch without dates", () => {
      mockFetch();
      render(<PositivityChart start="" end="" />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("renders state scope without uf", async () => {
      mockFetch();
      render(<PositivityChart start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      const formatter = lastOption().tooltip.formatter;
      formatter([{ name: "A", value: 0.5 }]);
      expect(i18nMock.t).toHaveBeenCalledWith("charts_contaovos.positivity_tooltip", {
        name: "A",
        value: "0.50",
      });
    });

    it("renders city scope with uf", async () => {
      mockFetch();
      render(<PositivityChart uf="SP" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect((global.fetch as any).mock.calls[0][0]).toContain("uf=SP");
    });

    it("handles empty data", async () => {
      mockFetch({ positivity: [] });
      render(<PositivityChart uf="SP" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      await new Promise((r) => setTimeout(r, 30));
      expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
    });

    it("handles fetch rejection", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ fail: true });
      render(<PositivityChart uf="SP" start="2024-01-01" end="2024-02-01" />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });
  });

  describe("MapChart", () => {
    it("does not fetch without geoJson", () => {
      mockFetch();
      render(<MapChart start="2024-01-01" end="2024-02-01" />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("does not fetch without dates", () => {
      mockFetch();
      render(<MapChart start="" end="" geoJson={{}} />);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("registers the map and renders states and scatter", async () => {
      mockFetch();
      const onStateSelect = vi.fn();
      render(
        <MapChart
          start="2024-01-01"
          end="2024-02-01"
          geoJson={{ type: "FeatureCollection" }}
          selectedState="SP"
          onStateSelect={onStateSelect}
        />
      );
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect(echartsMock.registerMap).toHaveBeenCalledWith("brazil", { type: "FeatureCollection" });
      const option = lastOption();
      expect(option.series).toHaveLength(2);
      expect(option.series[0].data[0].itemStyle.borderWidth).toBe(3);
    });

    it("invokes the state select handler and toggles off", async () => {
      mockFetch();
      const onStateSelect = vi.fn();
      render(
        <MapChart
          start="2024-01-01"
          end="2024-02-01"
          geoJson={{}}
          selectedState="SP"
          onStateSelect={onStateSelect}
        />
      );
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      act(() => {
        echartsMock.handlers.click?.({ componentType: "series", name: "SP" });
      });
      expect(onStateSelect).toHaveBeenCalledWith(null);
      act(() => {
        echartsMock.handlers.click?.({ componentType: "series", name: "RJ" });
      });
      expect(onStateSelect).toHaveBeenCalledWith("RJ");
    });

    it("handles empty states and scatter data", async () => {
      mockFetch({ map: [], scatter: [] });
      render(<MapChart start="2024-01-01" end="2024-02-01" geoJson={{}} />);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
      await new Promise((r) => setTimeout(r, 30));
      expect(echartsMock.instance.setOption).not.toHaveBeenCalled();
    });

    it("handles map fetch rejection", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetch({ fail: true });
      render(<MapChart start="2024-01-01" end="2024-02-01" geoJson={{}} />);
      await waitFor(() => expect(err).toHaveBeenCalled());
    });

    it("renders the map and scatter tooltip formatters", async () => {
      mockFetch();
      render(<MapChart start="2024-01-01" end="2024-02-01" geoJson={{}} />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      const formatter = lastOption().tooltip.formatter;
      expect(formatter({ seriesType: "map", name: "SP" })).toBe("charts_contaovos.map_tooltip_state");
      expect(formatter({ seriesType: "map", name: "NOPE" })).toBe("");
      expect(formatter({ seriesType: "scatter", data: { id: "t1" } })).toBe("charts_contaovos.map_tooltip_scatter");
      expect(formatter({ seriesType: "scatter", data: { id: "x" } })).toBe("");
      expect(formatter({ seriesType: "other" })).toBe("");
    });
  });

  describe("EggCountChart", () => {
    it("renders the composed chart and allows selecting a state", async () => {
      mockFetch();
      render(<EggCountChart start="2024-01-01" end="2024-02-01" geoJson={{}} />);
      await waitFor(() => expect(echartsMock.instance.setOption).toHaveBeenCalled());
      expect((global.fetch as any).mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });
});
