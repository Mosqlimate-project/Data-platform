import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

describe("app/api/user/profile/models", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns models on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1 }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/user/profile/models/");
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ message: "Failed to fetch profile" });
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
