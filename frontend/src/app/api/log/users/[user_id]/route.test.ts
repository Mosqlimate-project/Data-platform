import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (
  cookies: Record<string, string> = { access_token: "at" },
  body: unknown = {}
) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    json: async () => body,
  }) as any;

const params = { user_id: "42" };

describe("app/api/log/users/[user_id]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq({}), { params: params as any });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns updated data on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ enabled: true }),
    });
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq({ access_token: "at" }, { enabled: true }), {
      params: params as any,
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ enabled: true });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/log/users/42/");
    expect(init.method).toBe("PATCH");
    expect(init.headers.Authorization).toBe("Bearer at");
    expect(JSON.parse(init.body)).toEqual({ enabled: true });
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400 });
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: params as any });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      message: "Failed to update user account settings",
    });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: params as any });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
