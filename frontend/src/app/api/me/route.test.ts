import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyUser = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/auth/verify", () => ({
  verifyUser: mockVerifyUser,
}));

const makeReq = (cookies: Record<string, string> = { access_token: "at" }) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

describe("app/api/me", () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerifyUser.mockReset();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when not verified", async () => {
    mockVerifyUser.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(await res.text()).toBe("Unauthorized");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns profile and propagates headers", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "a=1; Path=/");
    mockVerifyUser.mockResolvedValue({ user: { sub: "1" }, headers });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ username: "bob" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ username: "bob" });
    expect(res.headers.get("set-cookie")).toContain("a=1");
    const init = (global.fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("maps upstream error status", async () => {
    mockVerifyUser.mockResolvedValue({ user: {} });
    (global.fetch as any).mockResolvedValue({ ok: false, status: 403 });
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "Failed to fetch user profile" });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    mockVerifyUser.mockResolvedValue({ user: {} });
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
