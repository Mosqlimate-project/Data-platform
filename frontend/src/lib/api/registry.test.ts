import { describe, it, expect, vi } from "vitest";

describe("lib/api/registry fetchPrediction", () => {
  it("returns prediction on success", async () => {
    vi.stubEnv("FRONTEND_SECRET", "secret");
    vi.resetModules();
    const { fetchPrediction } = await import("./registry");
    const pred = { id: 1 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(pred),
    }) as any;
    expect(await fetchPrediction(1)).toEqual(pred);
    expect(fetch).toHaveBeenCalledWith("/api/predictions/1", expect.any(Object));
  });

  it("returns null and logs when response not ok", async () => {
    vi.stubEnv("FRONTEND_SECRET", "secret");
    vi.resetModules();
    const { fetchPrediction } = await import("./registry");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ message: "boom" }),
    }) as any;
    expect(await fetchPrediction(1)).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("returns null when fetch rejects", async () => {
    vi.stubEnv("FRONTEND_SECRET", "secret");
    vi.resetModules();
    const { fetchPrediction } = await import("./registry");
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as any;
    expect(await fetchPrediction(1)).toBeNull();
  });

  it("uses the fallback message when the error has none", async () => {
    vi.stubEnv("FRONTEND_SECRET", "secret");
    vi.resetModules();
    const { fetchPrediction } = await import("./registry");
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({}),
    }) as any;
    expect(await fetchPrediction(1)).toBeNull();
  });

  it("sends an empty secret when FRONTEND_SECRET is not configured", async () => {
    vi.stubEnv("FRONTEND_SECRET", "");
    vi.resetModules();
    const { fetchPrediction } = await import("./registry");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ id: 1 }),
    }) as any;
    await fetchPrediction(1);
    const headers = (fetch as any).mock.calls[0][1].headers;
    expect(headers["x-internal-secret"]).toBe("");
  });
});
