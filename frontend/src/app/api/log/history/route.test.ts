import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }, params: Record<string, string> = {}) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/log/history", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns data with default limit", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ event: "x" }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ event: "x" }]);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain("/api/log/history/?limit=100");
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("uses provided limit param", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    const { GET } = await import("./route");
    await GET(makeReq({ access_token: "at" }, { limit: "50" }));
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/log/history/?limit=50");
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: "Failed to fetch stream logs history" });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
