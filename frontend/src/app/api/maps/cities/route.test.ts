import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string, params: Record<string, string> = {}) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/maps/cities", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("ADMIN_UIDKEY", "u:k");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns 500 when ADMIN_UIDKEY missing", async () => {
    vi.stubEnv("ADMIN_UIDKEY", "");
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Server not configured" });
  });

  it("returns 401 when secret missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(undefined));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
  });

  it("returns 400 when uf missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Missing required parameter: uf" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("formats string geometry into FeatureCollection", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        features: [
          { properties: { a: 1 }, geometry: '{"type":"Point"}' },
          { properties: { b: 2 }, geometry: { type: "Polygon" } },
        ],
      }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { uf: "SP" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      type: "FeatureCollection",
      features: [
        { properties: { a: 1 }, geometry: { type: "Point" } },
        { properties: { b: 2 }, geometry: { type: "Polygon" } },
      ],
    });
    expect(res.headers.get("Cache-Control")).toBe(
      "public, s-maxage=86400, stale-while-revalidate=43200"
    );
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/maps/cities/SP");
  });

  it("forwards upstream error body", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "not found",
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { uf: "SP" }));
    expect(res.status).toBe(404);
    expect(await res.text()).toBe("not found");
  });

  it("returns 502 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { uf: "SP" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Upstream request failed" });
    expect(err).toHaveBeenCalled();
  });
});
