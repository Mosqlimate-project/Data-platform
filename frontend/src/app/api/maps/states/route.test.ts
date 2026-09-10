import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string, params: Record<string, string> = {}) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/maps/states", () => {
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

  it("forwards multiple uf params", async () => {
    const req = makeReq("fs");
    req.nextUrl.searchParams = new URLSearchParams("uf=SP&uf=RJ");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        features: [{ properties: {}, geometry: { type: "Point" } }],
      }),
    });
    const { GET } = await import("./route");
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect((await res.json()).type).toBe("FeatureCollection");
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/maps/states?uf=SP&uf=RJ");
  });

  it("omits uf param when none present", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ features: [] }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"));
    expect(res.status).toBe(200);
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toBe("http://backend:8042/api/maps/states");
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
