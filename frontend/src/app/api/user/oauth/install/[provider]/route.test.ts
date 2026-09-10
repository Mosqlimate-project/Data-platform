import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookies = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

const makeReq = (params: Record<string, string> = {}) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

const params = { params: { provider: "github" } };

describe("app/api/user/oauth/install/[provider]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCookies.get.mockReset();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    mockCookies.get.mockReturnValue(undefined);
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ detail: "Unauthorized" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects to upstream url on success", async () => {
    mockCookies.get.mockReturnValue({ value: "at" });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://github.com/install" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ next: "/dashboard" }), params as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://github.com/install");
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/user/oauth/install/github/");
    expect(url).toContain("next=%2Fdashboard");
  });

  it("maps upstream error detail", async () => {
    mockCookies.get.mockReturnValue({ value: "at" });
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ detail: "bad provider" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ detail: "bad provider" });
  });

  it("falls back to Backend error when detail missing", async () => {
    mockCookies.get.mockReturnValue({ value: "at" });
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no json");
      },
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ detail: "Backend error" });
  });

  it("returns 500 when fetch rejects", async () => {
    mockCookies.get.mockReturnValue({ value: "at" });
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ detail: "Internal Server Error" });
  });
});
