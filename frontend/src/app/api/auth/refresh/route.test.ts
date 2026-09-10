import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = {}) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

describe("app/api/auth/refresh", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no refresh token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 401 when upstream not ok", async () => {
    const { GET } = await import("./route");
    (global.fetch as any).mockResolvedValue({ ok: false, status: 401 });
    const res = await GET(makeReq({ refresh_token: "rt" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("returns access token and sets cookies on success", async () => {
    const { GET } = await import("./route");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "newat", refresh_token: "newrt" }),
    });
    const res = await GET(makeReq({ refresh_token: "rt" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: "newat" });
    expect(res.cookies.get("access_token")?.value).toBe("newat");
    expect(res.cookies.get("refresh_token")?.value).toBe("newrt");
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/user/refresh/");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ refresh_token: "rt" });
  });

  it("propagates upstream rejection", async () => {
    const { GET } = await import("./route");
    (global.fetch as any).mockRejectedValue(new Error("network"));
    await expect(GET(makeReq({ refresh_token: "rt" }))).rejects.toThrow("network");
  });
});
