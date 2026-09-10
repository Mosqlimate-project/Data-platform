import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (body: unknown = {}) =>
  ({
    json: async () => body,
  }) as any;

describe("app/api/auth/set-session", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 on invalid credentials", async () => {
    const { POST } = await import("./route");
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400 });
    const res = await POST(makeReq({ username: "u", password: "p" }));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid credentials" });
  });

  it("sets tokens on success", async () => {
    const { POST } = await import("./route");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at", refresh_token: "rt" }),
    });
    const res = await POST(makeReq({ username: "u", password: "p" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(res.cookies.get("access_token")?.value).toBe("at");
    expect(res.cookies.get("refresh_token")?.value).toBe("rt");
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/user/login/");
    expect(init.method).toBe("POST");
  });

  it("propagates upstream rejection", async () => {
    const { POST } = await import("./route");
    (global.fetch as any).mockRejectedValue(new Error("network"));
    await expect(POST(makeReq({}))).rejects.toThrow("network");
  });
});
