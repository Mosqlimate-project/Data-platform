import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

describe("app/api/registry/model/add/sprint/actives", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 false when no token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns data on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ sprint: 1 }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ sprint: 1 }]);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/registry/model/add/sprint/actives/");
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("maps upstream error to false status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toBe(false);
  });

  it("returns 500 false when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toBe(false);
  });
});
