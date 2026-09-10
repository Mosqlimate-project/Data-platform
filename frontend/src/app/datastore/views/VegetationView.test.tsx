import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { VegetationView } from "./VegetationView";
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

const config: EndpointDetails = {
  endpoint: "/vegetation/",
  name: "Vegetation",
  description: "desc",
  source: "src",
  more_info_link: "link",
  tags: [],
  data_variables: [],
  chart_options: [],
};

describe("datastore/views/VegetationView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the unavailable placeholder", () => {
    render(<VegetationView config={config} />);
    expect(screen.getByText("Charts Unavailable")).toBeInTheDocument();
  });

  it("validates start and end dates", () => {
    render(<VegetationView config={config} />);
    const dates = Array.from(screen.getByTestId("controls").querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    const original = dates[0].value;
    fireEvent.change(dates[0], { target: { value: "2999-01-01" } });
    expect(dates[0].value).toBe(original);
  });

  it("clears geocode when a uf is typed and flags invalid uf", () => {
    render(<VegetationView config={config} />);
    const ufInput = screen.getByTestId("api-builder").querySelector('input[placeholder="e.g. RJ"]') as HTMLInputElement;
    fireEvent.change(ufInput, { target: { value: "rj" } });
    expect(ufInput.value).toBe("RJ");
    expect(screen.getAllByTestId("city-value")[1].textContent).toBe("undefined");
    fireEvent.change(ufInput, { target: { value: "ZZ" } });
    expect(ufInput.className).toContain("border-destructive");
  });

  it("updates collection and attribute fields", () => {
    render(<VegetationView config={config} />);
    const collection = screen.getByPlaceholderText("e.g. modis") as HTMLInputElement;
    const attribute = screen.getByPlaceholderText("e.g. ndvi") as HTMLInputElement;
    fireEvent.change(collection, { target: { value: "modis" } });
    fireEvent.change(attribute, { target: { value: "ndvi" } });
    expect(collection.value).toBe("modis");
    expect(attribute.value).toBe("ndvi");
  });

  it("requires login before downloading", () => {
    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    expect(auth.openLogin).toHaveBeenCalled();
  });

  it("downloads data when logged in", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ a: 1 }] }) });
    }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("alerts when there is no data", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it("alerts when the export request fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: false, json: async () => ({}) });
    }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  });

  it("alerts when the api key fetch fails", async () => {
    auth.user = { username: "a" };
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalled());
    expect(err).toHaveBeenCalled();
  });

  it("downloads JSON when logged in", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => [{ a: 1 }] });
    }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "JSON" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("downloads CSV from an items response", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => ({ items: [{ a: 1 }] }) });
    }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("downloads CSV from a plain object response", async () => {
    auth.user = { username: "a" };
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.resolve({ ok: true, json: async () => ({ api_key: "k" }) });
      return Promise.resolve({ ok: true, json: async () => ({ a: 1, b: 2 }) });
    }) as unknown as typeof fetch;

    render(<VegetationView config={config} />);
    fireEvent.click(screen.getAllByTestId("city-select")[1]);
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
    await waitFor(() => expect(window.URL.createObjectURL).toHaveBeenCalled());
  });

  it("shows a warning while the download is disabled", () => {
    auth.user = { username: "a" };
    render(<VegetationView config={config} />);
    expect(screen.getByText("Select City or UF")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "CSV" }));
  });

  it("accepts valid date changes and rejects invalid end dates", () => {
    render(<VegetationView config={config} />);
    const dates = Array.from(screen.getByTestId("controls").querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    fireEvent.change(dates[0], { target: { value: "2024-03-01" } });
    expect(dates[0].value).toBe("2024-03-01");
    fireEvent.change(dates[1], { target: { value: "1900-01-01" } });
    expect(dates[1].value).not.toBe("1900-01-01");
    fireEvent.change(dates[1], { target: { value: "2024-04-01" } });
    expect(dates[1].value).toBe("2024-04-01");
  });

  it("updates page fields and opens the date picker", () => {
    render(<VegetationView config={config} />);
    const apiBuilder = screen.getByTestId("api-builder");
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
    render(<VegetationView config={config} />);
    const dates = Array.from(screen.getByTestId("controls").querySelectorAll('input[type="date"]')) as HTMLInputElement[];
    fireEvent.change(dates[0], { target: { value: "" } });
    expect(screen.getByText("MM/DD/YYYY")).toBeInTheDocument();
  });
});
