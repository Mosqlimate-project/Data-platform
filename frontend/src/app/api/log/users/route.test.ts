import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

describe("app/api/log/users", () => {
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

  it("returns data on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1 }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/log/users/");
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "Failed to fetch users" });
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
