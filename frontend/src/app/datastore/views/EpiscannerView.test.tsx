import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
});
