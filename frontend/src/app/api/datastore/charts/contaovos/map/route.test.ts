import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string, params: Record<string, string> = {}) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

const okRes = (body = "{}", status = 200, contentType?: string) =>
  ({
    status,
    text: async () => body,
    headers: { get: (name: string) => (name === "Content-Type" ? contentType ?? null : null) },
  }) as any;

describe("app/api/datastore/charts/contaovos/map", () => {
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

  it("forwards body with query params", async () => {
    (global.fetch as any).mockResolvedValue(okRes("data", 200, "application/json"));
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { start: "1", end: "2" }));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("data");
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/datastore/charts/contaovos/map/?start=1&end=2");
  });

  it("forwards upstream error status", async () => {
    (global.fetch as any).mockResolvedValue(okRes("err", 500));
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { start: "1" }));
    expect(res.status).toBe(500);
    expect(await res.text()).toBe("err");
  });

  it("returns 502 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { start: "1" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Upstream request failed" });
    expect(err).toHaveBeenCalled();
  });
});
