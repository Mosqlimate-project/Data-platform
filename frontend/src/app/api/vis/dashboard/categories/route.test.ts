import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string, cookies: Record<string, string> = {}) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

describe("app/api/vis/dashboard/categories", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when secret missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(undefined));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns data with auth header when token present", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ["cat"],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { access_token: "at" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(["cat"]);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/vis/dashboard/categories/");
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("omits auth header when no token", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    const { GET } = await import("./route");
    await GET(makeReq("fs"));
    const init = (global.fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Upstream error" });
  });

  it("returns 502 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Upstream request failed" });
    expect(err).toHaveBeenCalled();
  });
});
