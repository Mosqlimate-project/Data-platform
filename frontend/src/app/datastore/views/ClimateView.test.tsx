import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ClimateView } from "./ClimateView";
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

vi.mock("../components/CitySearch", () => ({
  default: ({ value, onChange }: any) => (
    <div>
      <span data-testid="city-value">{String(value)}</span>
      <button data-testid="city-select" onClick={() => onChange(123)}>
        select
      </button>
      <button data-testid="city-clear" onClick={() => onChange(undefined)}>
        clear
      </button>
    </div>
  ),
}));

vi.mock("../components/charts/ClimateCharts", () => ({
  TemperatureChart: (p: any) => <div data-testid="temp" data-geocode={p.geocode} />,
  AccumulatedWaterfallChart: () => <div data-testid="waterfall" />,
  AirChart: () => <div data-testid="air" />,
}));

const config: EndpointDetails = {
  endpoint: "/climate/",
  name: "Climate",
  description: "desc",
  source: "src",
  more_info_link: "link",
  tags: [],
  data_variables: [],
  chart_options: [],
};

function controlsDates() {
  const controls = screen.getByTestId("controls");
  return Array.from(controls.querySelectorAll('input[type="date"]')) as HTMLInputElement[];
}

describe("datastore/views/ClimateView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders charts and controls", () => {
    render(<ClimateView config={config} />);
    expect(screen.getByTestId("temp")).toBeInTheDocument();
    expect(screen.getByTestId("waterfall")).toBeInTheDocument();
    expect(screen.getByTestId("air")).toBeInTheDocument();
    expect(screen.getByTestId("controls")).toBeInTheDocument();
  });

  it("ignores invalid start and end dates", () => {
    render(<ClimateView config={config} />);
    const [start, end] = controlsDates();
    const originalStart = start.value;
    const originalEnd = end.value;

    fireEvent.change(start, { target: { value: "2999-01-01" } });
    expect(start.value).toBe(originalStart);

    fireEvent.change(end, { target: { value: "1900-01-01" } });
    expect(end.value).toBe(originalEnd);
  });

  it("updates valid dates", () => {
    render(<ClimateView config={config} />);
    const [start, end] = controlsDates();
    fireEvent.change(start, { target: { value: "2024-03-01" } });
    expect(start.value).toBe("2024-03-01");
    fireEvent.change(end, { target: { value: "2024-04-01" } });
    expect(end.value).toBe("2024-04-01");
  });

  it("updates geocode from the city search", () => {
    render(<ClimateView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[0]);
    expect(screen.getByTestId("temp").getAttribute("data-geocode")).toBe("123");
  });

  it("toggles uf and clears geocode", () => {
    render(<ClimateView config={config} />);
    const apiBuilder = screen.getByTestId("api-builder");
    const ufInput = apiBuilder.querySelector('input[placeholder="e.g. RJ"]') as HTMLInputElement;
    fireEvent.change(ufInput, { target: { value: "rj" } });
    expect(ufInput.value).toBe("RJ");
    expect(screen.getAllByTestId("city-value")[1].textContent).toBe("undefined");
  });

  it("flags an invalid uf", () => {
    render(<ClimateView config={config} />);
    const apiBuilder = screen.getByTestId("api-builder");
    const ufInput = apiBuilder.querySelector('input[placeholder="e.g. RJ"]') as HTMLInputElement;
    fireEvent.change(ufInput, { target: { value: "ZZ" } });
    expect(ufInput.className).toContain("border-destructive");
  });

  it("requires login before downloading", () => {
    render(<ClimateView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    const csvButton = screen.getByRole("button", { name: "CSV" });
    fireEvent.click(csvButton);
    expect(auth.openLogin).toHaveBeenCalled();
  });

  it("downloads CSV and JSON when logged in", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => [{ a: 1 }] });
    }) as unknown as typeof fetch;

    render(<ClimateView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);

    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalledTimes(2));
  });

  it("alerts when the api key fetch fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    render(<ClimateView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it("alerts when there is no data to export", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;

    render(<ClimateView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });
});
