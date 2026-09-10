import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InfodengueView } from "./InfodengueView";
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
    </div>
  ),
}));

vi.mock("../components/charts/InfodengueCharts", () => ({
  TotalCases: (p: any) => <div data-testid="total" data-disease={p.disease} />,
  DailyCasesChart: () => <div data-testid="daily" />,
  RtChart: () => <div data-testid="rt" />,
}));

const config: EndpointDetails = {
  endpoint: "/infodengue/",
  name: "Infodengue",
  description: "desc",
  source: "src",
  more_info_link: "link",
  tags: [],
  data_variables: [],
  chart_options: [],
};

describe("datastore/views/InfodengueView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the charts", () => {
    render(<InfodengueView config={config} />);
    expect(screen.getByTestId("total")).toBeInTheDocument();
    expect(screen.getByTestId("daily")).toBeInTheDocument();
    expect(screen.getByTestId("rt")).toBeInTheDocument();
  });

  it("updates the disease from the controls select", () => {
    render(<InfodengueView config={config} />);
    const select = screen.getByTestId("controls").querySelector("select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "zika" } });
    expect(screen.getByTestId("total").getAttribute("data-disease")).toBe("zika");
  });

  it("sets geocode from the city search", () => {
    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[0]);
    expect(screen.getByTestId("total").getAttribute("data-disease")).toBe("dengue");
  });

  it("toggles uf and flags invalid values", () => {
    render(<InfodengueView config={config} />);
    const ufInput = screen.getByTestId("api-builder").querySelector('input[placeholder="e.g. RJ"]') as HTMLInputElement;
    fireEvent.change(ufInput, { target: { value: "sp" } });
    expect(ufInput.value).toBe("SP");
    expect(screen.getAllByTestId("city-value")[1].textContent).toBe("undefined");

    fireEvent.change(ufInput, { target: { value: "ZZ" } });
    expect(ufInput.className).toContain("border-destructive");
  });

  it("requires login before downloading", () => {
    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(auth.openLogin).toHaveBeenCalled();
  });

  it("downloads using the items array", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => ({ items: [{ a: 1 }] }) });
    }) as unknown as typeof fetch;

    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("alerts when the export has no rows", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it("alerts when the download request fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it("downloads CSV from an array response", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => [{ a: 1 }] });
    }) as unknown as typeof fetch;

    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("alerts when the api key fetch fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    render(<InfodengueView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(err).toHaveBeenCalled();
  });

  it("shows a warning while the download is disabled", () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<InfodengueView config={config} />);
    expect(screen.getByText("Select City or UF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
  });

  it("updates api builder fields and opens the date picker", () => {
    render(<InfodengueView config={config} />);
    const apiBuilder = screen.getByTestId("api-builder");

    const disease = apiBuilder.querySelector("select") as HTMLSelectElement;
    fireEvent.change(disease, { target: { value: "zika" } });
    expect(disease.value).toBe("zika");

    const numbers = apiBuilder.querySelectorAll('input[type="number"]') as NodeListOf<HTMLInputElement>;
    fireEvent.change(numbers[0], { target: { value: "0" } });
    expect(numbers[0].value).toBe("1");
    fireEvent.change(numbers[1], { target: { value: "500" } });
    expect(numbers[1].value).toBe("300");
    fireEvent.change(numbers[1], { target: { value: "0" } });
    expect(numbers[1].value).toBe("1");

    const dates = Array.from(screen.getByTestId("controls").querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    fireEvent.click(dates[0]);
  });

  it("shows the date format placeholder when a date is cleared", () => {
    render(<InfodengueView config={config} />);
    const dates = Array.from(screen.getByTestId("controls").querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    fireEvent.change(dates[0], { target: { value: "" } });
    expect(screen.getByText("MM/DD/YYYY")).toBeInTheDocument();
  });
});
