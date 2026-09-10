import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContaovosView } from "./ContaovosView";
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

vi.mock("../components/charts/ContaovosCharts", () => ({
  EggCountChart: (p: any) => <div data-testid="egg-count" data-has-geo={String(!!p.geoJson)} />,
}));

const config: EndpointDetails = {
  endpoint: "/mosquito/",
  name: "Mosquito",
  description: "desc",
  source: "src",
  more_info_link: "link",
  tags: [],
  data_variables: [],
  chart_options: [],
};

describe("datastore/views/ContaovosView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the map geojson on mount", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ type: "FeatureCollection" }) }) as unknown as typeof fetch;
    render(<ContaovosView config={config} />);
    await waitFor(() => expect(screen.getByTestId("egg-count").getAttribute("data-has-geo")).toBe("true"));
    expect(String((global.fetch as any).mock.calls[0][0])).toContain("/api/maps/states");
  });

  it("logs an error when the map fails to load", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<ContaovosView config={config} />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("renders controls and validates dates", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ContaovosView config={config} />);
    const dates = Array.from(screen.getByTestId("controls").querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    const original = dates[0].value;
    fireEvent.change(dates[0], { target: { value: "2999-01-01" } });
    expect(dates[0].value).toBe(original);
  });

  it("requires login before downloading", () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ContaovosView config={config} />);
    const stateInput = screen.getByTestId("api-builder").querySelector('input[placeholder="e.g. MS"]') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: "MS" } });
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(auth.openLogin).toHaveBeenCalled();
  });

  it("downloads data when logged in", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/states")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => [{ a: 1 }] });
    }) as unknown as typeof fetch;

    render(<ContaovosView config={config} />);
    const stateInput = screen.getByTestId("api-builder").querySelector('input[placeholder="e.g. MS"]') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: "MS" } });
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("alerts when there is no data", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      if (url.includes("/api/maps/states")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<ContaovosView config={config} />);
    const stateInput = screen.getByTestId("api-builder").querySelector('input[placeholder="e.g. MS"]') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: "MS" } });
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });
});
