import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCookies } = vi.hoisted(() => ({
  mockCookies: { get: vi.fn() },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookies),
}));

describe("lib/dashboard/api", () => {
  beforeEach(() => {
    vi.stubEnv("FRONTEND_SECRET", "secret");
    vi.resetModules();
  });

  const ok = (data: unknown) =>
    ({ ok: true, json: vi.fn().mockResolvedValue(data) }) as any;

  it("fetchPredictionMetadata returns metadata", async () => {
    const { fetchPredictionMetadata } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(
      ok({ id: 1, disease_code: "A90" })
    ) as any;
    const meta = await fetchPredictionMetadata("1");
    expect(meta.disease_code).toBe("A90");
  });

  it("fetchPredictionMetadata throws when not ok", async () => {
    const { fetchPredictionMetadata } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(fetchPredictionMetadata("1")).rejects.toThrow(
      "Metadata fetch failed"
    );
  });

  it("fetchSprints builds params incl country", async () => {
    const { fetchSprints } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([{ year: 2024 }])) as any;
    const sprints = await fetchSprints("quantitative", 0, "A90", "BRA");
    expect(sprints[0].year).toBe(2024);
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("adm_level=0");
    expect(url).toContain("country=BRA");
  });

  it("fetchPredictions includes sprint param", async () => {
    const { fetchPredictions } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchPredictions("categorical", 1, "A90", "reported", undefined, "RJ");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("state=RJ");
    expect(url).toContain("case_definition=reported");
  });

  it("fetchCases appends adm params", async () => {
    const { fetchCases } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchCases("A90", 2, false, "reported", "2024-01-01", "2024-01-31", "BRA", undefined, "3304557");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("adm_2=3304557");
  });

  it("fetchPredictionData returns rows", async () => {
    const { fetchPredictionData } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([{ date: "2024-01-01", pred: 1 }])) as any;
    const rows = await fetchPredictionData(1);
    expect(rows[0].pred).toBe(1);
  });

  it("fetchTree returns tree", async () => {
    const { fetchTree } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(
      ok({ diseases: {}, countries: {}, states: {}, cities: {} })
    ) as any;
    const tree = await fetchTree();
    expect(tree.cities).toEqual({});
  });

  it("server-side getHeaders includes cookie when token present", async () => {
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    mockCookies.get.mockReturnValue({ value: "tok123" });
    const { fetchTree } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(
      ok({ diseases: {}, countries: {}, states: {}, cities: {} })
    ) as any;
    await fetchTree();
    const headers = (fetch as any).mock.calls[0][1].headers;
    expect(headers.cookie).toBe("access_token=tok123");
  });

  it("server-side getHeaders omits cookie when no token", async () => {
    vi.stubGlobal("window", undefined);
    vi.resetModules();
    mockCookies.get.mockReturnValue(undefined);
    const { fetchSprints } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchSprints("quantitative", 3, "A90");
    const headers = (fetch as any).mock.calls[0][1].headers;
    expect(headers.cookie).toBeUndefined();
    expect(headers["x-internal-secret"]).toBe("secret");
  });

  it("client-side getHeaders omits cookie", async () => {
    vi.resetModules();
    const { fetchTree } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(
      ok({ diseases: {}, countries: {}, states: {}, cities: {} })
    ) as any;
    await fetchTree();
    const headers = (fetch as any).mock.calls[0][1].headers;
    expect(headers.cookie).toBeUndefined();
    expect(headers["x-internal-secret"]).toBe("secret");
    expect((fetch as any).mock.calls[0][0]).toBe("/api/vis/dashboard/tree/");
  });

  it("sends an empty secret when FRONTEND_SECRET is not configured", async () => {
    vi.stubEnv("FRONTEND_SECRET", "");
    vi.resetModules();
    const { fetchTree } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(
      ok({ diseases: {}, countries: {}, states: {}, cities: {} })
    ) as any;
    await fetchTree();
    const headers = (fetch as any).mock.calls[0][1].headers;
    expect(headers["x-internal-secret"]).toBe("");
  });

  it("fetchSprints skips location params when admLevel 0 has no country", async () => {
    const { fetchSprints } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchSprints("quantitative", 0, "A90");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).not.toContain("country=");
  });

  it("fetchSprints appends state for admLevel 1", async () => {
    const { fetchSprints } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchSprints("quantitative", 1, "A90", "BRA", "RJ");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("state=RJ");
  });

  it("fetchSprints appends city for admLevel 2", async () => {
    const { fetchSprints } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchSprints("quantitative", 2, "A90", "BRA", "RJ", "3304557");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("city=3304557");
  });

  it("fetchPredictions appends country for admLevel 0", async () => {
    const { fetchPredictions } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchPredictions("quantitative", 0, "A90", "reported", "BRA");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("country=BRA");
  });

  it("fetchPredictions appends city for admLevel 2", async () => {
    const { fetchPredictions } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchPredictions("quantitative", 2, "A90", "reported", "BRA", "RJ", "3304557");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("city=3304557");
  });

  it("fetchPredictions skips location params for admLevel 3", async () => {
    const { fetchPredictions } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchPredictions("quantitative", 3, "A90", "reported");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).not.toContain("country=");
    expect(url).not.toContain("state=");
    expect(url).not.toContain("city=");
  });

  it("fetchCases appends adm_0 for admLevel 0", async () => {
    const { fetchCases } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchCases("A90", 0, false, "reported", "2024-01-01", "2024-01-31", "BRA");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("adm_0=BRA");
  });

  it("fetchCases appends adm_1 for admLevel 1", async () => {
    const { fetchCases } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchCases("A90", 1, false, "reported", "2024-01-01", "2024-01-31", "BRA", "RJ");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).toContain("adm_1=RJ");
    expect(url).not.toContain("adm_2=");
  });

  it("fetchCases skips adm_1 when admLevel 1 has no adm1", async () => {
    const { fetchCases } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue(ok([])) as any;
    await fetchCases("A90", 1, false, "reported", "2024-01-01", "2024-01-31", "BRA");
    const url = (fetch as any).mock.calls[0][0];
    expect(url).not.toContain("adm_1=");
  });

  it("fetchCases throws when not ok", async () => {
    const { fetchCases } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(
      fetchCases("A90", 1, false, "reported", "2024-01-01", "2024-01-31", "BRA")
    ).rejects.toThrow("Failed to fetch cases");
  });

  it("fetchSprints throws when not ok", async () => {
    const { fetchSprints } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(fetchSprints("quantitative", 0, "A90")).rejects.toThrow(
      "Failed to fetch sprints"
    );
  });

  it("fetchPredictions throws when not ok", async () => {
    const { fetchPredictions } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(
      fetchPredictions("quantitative", 0, "A90", "reported")
    ).rejects.toThrow("Failed to fetch predictions");
  });

  it("fetchPredictionData throws when not ok", async () => {
    const { fetchPredictionData } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(fetchPredictionData(1)).rejects.toThrow(
      "Failed to fetch prediction data"
    );
  });

  it("fetchTree throws when not ok", async () => {
    const { fetchTree } = await import("./api");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    await expect(fetchTree()).rejects.toThrow("Failed to fetch tree");
  });
});
