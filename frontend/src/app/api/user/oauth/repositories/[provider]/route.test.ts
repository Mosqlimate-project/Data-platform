import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

const params = { params: { provider: "github" } };

describe("app/api/user/oauth/repositories/[provider]", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq({}), params as any);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns repositories on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ name: "repo" }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ name: "repo" }]);
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/user/repositories/github/");
  });

  it("maps upstream error message", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "forbidden" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "forbidden" });
  });

  it("falls back to default error message", async () => {
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
    expect(await res.json()).toEqual({ message: "Failed to fetch repositories" });
  });

  it("returns 500 when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
  });
});
