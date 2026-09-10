import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import CitySearch from "./CitySearch";

const cities = [
  { geocode: "3304557", name: "Rio de Janeiro", adm1: "RJ", country: "Brazil" },
  { geocode: "3550308", name: "Sao Paulo", adm1: "SP", country: "Brazil" },
];

function mockFetch(ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: async () => cities,
  }) as unknown as typeof fetch;
}

async function advance() {
  await act(async () => {
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe("datastore/components/CitySearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("does not fetch for short queries", async () => {
    mockFetch();
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ab" } });
    await advance();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("fetches by name and renders results", async () => {
    mockFetch();
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });
    await advance();
    expect(String((global.fetch as any).mock.calls[0][0])).toContain("name=Rio");
    expect(screen.getByText("Rio de Janeiro")).toBeInTheDocument();
  });

  it("fetches by geocode for numeric queries", async () => {
    mockFetch();
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "3304557" } });
    await advance();
    expect(String((global.fetch as any).mock.calls[0][0])).toContain("geocode=3304557");
  });

  it("ignores non-ok responses", async () => {
    mockFetch(false);
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });
    await advance();
    expect(screen.queryByText("Rio de Janeiro")).not.toBeInTheDocument();
  });

  it("clears results on fetch error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });
    await advance();
    expect(screen.queryByText("Rio de Janeiro")).not.toBeInTheDocument();
  });

  it("shows the no results message", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });
    await advance();
    expect(screen.getByText("No cities found.")).toBeInTheDocument();
  });

  it("selects a city", async () => {
    mockFetch();
    const onChange = vi.fn();
    render(<CitySearch value={undefined} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });
    await advance();

    fireEvent.click(screen.getByText("Rio de Janeiro"));
    expect(onChange).toHaveBeenCalledWith(3304557);
    expect(screen.getByRole("textbox")).toHaveValue("Rio de Janeiro - RJ");
    expect(screen.queryByText("Sao Paulo")).not.toBeInTheDocument();
  });

  it("clears the selection", async () => {
    mockFetch();
    const onChange = vi.fn();
    render(<CitySearch value={3304557} onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });

    const clearButton = screen.getByRole("button");
    fireEvent.click(clearButton);
    expect(onChange).toHaveBeenLastCalledWith(undefined);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("opens on focus when there are results and closes on outside click", async () => {
    mockFetch();
    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Rio" } });
    await advance();
    expect(screen.getByText("Rio de Janeiro")).toBeInTheDocument();

    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Rio de Janeiro")).not.toBeInTheDocument();

    fireEvent.focus(input);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText("Rio de Janeiro")).not.toBeInTheDocument();
  });

  it("shows the clear button when a value is provided", () => {
    mockFetch();
    render(<CitySearch value={3304557} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("shows the loading spinner while the request is in flight", async () => {
    let resolveFetch: (v: any) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((res) => {
        resolveFetch = res;
      })
    ) as unknown as typeof fetch;

    render(<CitySearch value={undefined} onChange={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rio" } });

    await act(async () => {
      vi.advanceTimersByTime(500);
      await Promise.resolve();
    });

    expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    await act(async () => {
      resolveFetch!({ ok: true, json: async () => cities });
      await Promise.resolve();
      await Promise.resolve();
    });
  });
});
