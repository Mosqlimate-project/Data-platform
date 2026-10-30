import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }) =>
  ({
    cookies: {
      get: (name: string) =>
        cookies[name] ? { value: cookies[name] } : undefined,
    },
  }) as any;

const params = Promise.resolve({ provider: "github" });

describe("app/api/user/organizations/[provider]", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq({}), { params });
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns organizations on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ name: "acme" }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ name: "acme" }]);
    expect(String((global.fetch as any).mock.calls[0][0])).toContain(
      "/api/user/organizations/github/"
    );
  });

  it("maps upstream errors", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "not linked" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: "not linked" });
  });

  it("falls back when the error body is invalid", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("bad json");
      },
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      message: "Failed to fetch organizations",
    });
  });

  it("returns 500 when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params });
    expect(res.status).toBe(500);
  });
});
