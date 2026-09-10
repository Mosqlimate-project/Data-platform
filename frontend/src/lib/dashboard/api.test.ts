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
});
