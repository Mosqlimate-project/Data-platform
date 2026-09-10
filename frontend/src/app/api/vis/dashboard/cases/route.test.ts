import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string, params: Record<string, string> = {}) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/vis/dashboard/cases", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("ADMIN_UIDKEY", "u:k");
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

  it("returns data with filtered query params", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ cases: 5 }],
    });
    const { GET } = await import("./route");
    const res = await GET(
      makeReq("fs", { sprint: "1", disease: "dengue", other: "skip" })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ cases: 5 }]);
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/vis/dashboard/cases/?sprint=1&disease=dengue");
    expect(url).not.toContain("other=");
  });

  it("drops empty param values", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    });
    const { GET } = await import("./route");
    await GET(makeReq("fs", { sprint: "", disease: "dengue" }));
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("disease=dengue");
    expect(url).not.toContain("sprint=");
  });

  it("maps upstream error with details", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ msg: "boom" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { sprint: "1" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to fetch data from backend",
      details: { msg: "boom" },
    });
  });

  it("maps upstream error when json parse fails", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("bad");
      },
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { sprint: "1" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      error: "Failed to fetch data from backend",
      details: null,
    });
  });

  it("returns 500 when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs", { sprint: "1" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
  });
});
