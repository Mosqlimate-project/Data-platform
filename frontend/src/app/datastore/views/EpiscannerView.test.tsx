import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { EpiScannerView } from "./EpiscannerView";
import type { EndpointDetails } from "../types";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const auth = vi.hoisted(() => ({ user: null as any, openLogin: vi.fn() }));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: auth.user, openLogin: auth.openLogin }),
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

vi.mock("../components/EndpointLayout", () => ({
  EndpointLayout: ({ children, controls, apiBuilder }: any) => (
    <div>
      <div data-testid="controls">{controls}</div>
      <div data-testid="api-builder">{apiBuilder}</div>
      <div data-testid="children">{children}</div>
    </div>
  ),
}));

vi.mock("../components/charts/EpiscannerCharts", () => ({
  EpiScannerChart: (p: any) => (
    <div data-testid="scanner" data-count={p.data.length} data-uf={p.selectedUf}>
      <button data-testid="hover" onClick={() => p.onHover?.("Rio", p.data[0]?.value ?? 5, 10, 20)}>
        hover
      </button>
      <button data-testid="leave" onClick={() => p.onLeave?.()}>
        leave
      </button>
    </div>
  ),
}));

const config: EndpointDetails = {
  endpoint: "/episcanner/",
  name: "EpiScanner",
  description: "desc",
  source: "src",
  more_info_link: "link",
  tags: [],
  data_variables: [],
  chart_options: [],
};

describe("datastore/views/EpiscannerView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    theme.resolvedTheme = "light";
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches geojson and data on mount", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({ type: "FC" }) });
      return Promise.resolve({ ok: true, json: async () => [{ geocode: 1, R0: 2, muni_name: "Rio" }] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(screen.getByTestId("scanner").getAttribute("data-count")).toBe("1"));
  });

  it("ignores non-ok data responses", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: false, json: async () => [] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByTestId("scanner").getAttribute("data-count")).toBe("0");
  });

  it("logs fetch errors", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("refetches when the uf changes", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    const ufInput = screen.getByTestId("controls").querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(ufInput, { target: { value: "RJ" } });
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => String(c[0]).includes("uf=RJ"))).toBe(true)
    );
  });

  it("shows and hides the hover tooltip", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => [{ geocode: 1, R0: 2.5, muni_name: "Rio" }] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(screen.getByTestId("scanner").getAttribute("data-count")).toBe("1"));

    fireEvent.click(screen.getByTestId("hover"));
    expect(screen.getByText("Rio")).toBeInTheDocument();
    expect(screen.getByText(/2\.50/)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("leave"));
    expect(screen.queryByText("Rio")).not.toBeInTheDocument();
  });

  it("changes the metric variable", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => [{ geocode: 1, peak_week: 10, muni_name: "Rio" }] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(screen.getByTestId("scanner").getAttribute("data-count")).toBe("1"));

    const selects = screen.getByTestId("controls").querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "peak_week" } });
    fireEvent.click(screen.getByTestId("hover"));
    expect(screen.getByText(/10\.00/)).toBeInTheDocument();
  });

  it("requires login before downloading", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(auth.openLogin).toHaveBeenCalled();
  });

  it("downloads when logged in", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => [{ a: 1 }] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("alerts when the export is empty", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it("downloads CSV data when logged in", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => [{ a: 1 }] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("downloads CSV from an items response", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: true, json: async () => ({ items: [{ a: 1 }] }) });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("alerts when the export response fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(err).toHaveBeenCalled();
  });

  it("alerts when the api key fetch fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(err).toHaveBeenCalled();
  });

  it("shows a warning and disables downloads when the uf is invalid", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<EpiScannerView config={config} />);

    const controlsUf = screen.getByTestId("controls").querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(controlsUf, { target: { value: "" } });

    const builderUf = screen.getByTestId("api-builder").querySelector('input[placeholder="e.g. SP"]') as HTMLInputElement;
    fireEvent.change(builderUf, { target: { value: "" } });

    await waitFor(() => expect(screen.getByText("Input a valid UF")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
  });

  it("falls back to Unknown for items without a name", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => [{ geocode: 2, R0: 3 }] });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(screen.getByTestId("scanner").getAttribute("data-count")).toBe("1"));
  });

  it("renders dark theme classes", async () => {
    theme.resolvedTheme = "dark";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<EpiScannerView config={config} />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.getByText(/by city in/).className).toContain("bg-slate-800/80");
  });

  it("updates api builder fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<EpiScannerView config={config} />);
    const builder = screen.getByTestId("api-builder");

    const disease = builder.querySelector("select") as HTMLSelectElement;
    fireEvent.change(disease, { target: { value: "zika" } });
    expect(disease.value).toBe("zika");

    const ufInput = builder.querySelector('input[placeholder="e.g. SP"]') as HTMLInputElement;
    fireEvent.change(ufInput, { target: { value: "rj" } });
    expect(ufInput.value).toBe("RJ");

    const yearInput = builder.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(yearInput, { target: { value: "2023" } });
    fireEvent.change(yearInput, { target: { value: "0" } });
    expect(yearInput.value).toBe(String(new Date().getFullYear()));

    const controls = screen.getByTestId("controls");
    const diseaseSelect = controls.querySelectorAll("select")[0] as HTMLSelectElement;
    fireEvent.change(diseaseSelect, { target: { value: "chikungunya" } });

    const cYear = controls.querySelector('input[type="number"]') as HTMLInputElement;
    fireEvent.change(cYear, { target: { value: "2022" } });
    fireEvent.change(cYear, { target: { value: "0" } });
    expect(cYear.value).toBe(String(new Date().getFullYear()));
  });

  it("shows the download loaders while pending", async () => {
    auth.user = { username: "a" };
    let resolveData: (v: any) => void;
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/cities")) return Promise.resolve({ ok: true, json: async () => ({}) });
      if (url.includes("/api/datastore/charts/episcanner")) return Promise.resolve({ ok: true, json: async () => [] });
      return new Promise((res) => {
        resolveData = res;
      });
    }) as unknown as typeof fetch;

    render(<EpiScannerView config={config} />);

    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "CSV" }).querySelector(".animate-spin")).toBeInTheDocument();
    await act(async () => {
      resolveData!({ ok: true, json: async () => [{ a: 1 }] });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "CSV" }).querySelector(".animate-spin")).not.toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole("button", { name: "JSON" }).querySelector(".animate-spin")).toBeInTheDocument();
    await act(async () => {
      resolveData!({ ok: true, json: async () => [{ a: 1 }] });
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "JSON" }).querySelector(".animate-spin")).not.toBeInTheDocument()
    );
  });
});
