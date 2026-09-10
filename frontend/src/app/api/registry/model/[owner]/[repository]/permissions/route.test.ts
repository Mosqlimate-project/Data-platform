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

const params = { owner: "acme", repository: "repo" };

describe("app/api/registry/model/[owner]/[repository]/permissions", () => {
  beforeEach(() => {
    vi.resetModules();
    mockVerifyUser.mockReset();
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns is_owner false when not verified", async () => {
    mockVerifyUser.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params: params as any });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ is_owner: false, can_manage: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns is_owner false when no access token", async () => {
    mockVerifyUser.mockResolvedValue({ user: { sub: "1" } });
    const { GET } = await import("./route");
    const res = await GET(makeReq({}), { params: params as any });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ is_owner: false, can_manage: false });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns data and propagates headers on success", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "a=1; Path=/");
    mockVerifyUser.mockResolvedValue({ user: { sub: "1" }, headers });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ is_owner: true, can_manage: true }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params: params as any });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ is_owner: true, can_manage: true });
    expect(res.headers.get("set-cookie")).toContain("a=1");
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/registry/model/acme/repo/permissions/");
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("uses refreshed access token from verification headers", async () => {
    const headers = new Headers();
    headers.append("set-cookie", "access_token=newtok; Path=/");
    mockVerifyUser.mockResolvedValue({ user: { sub: "1" }, headers });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ is_owner: true }),
    });
    const { GET } = await import("./route");
    await GET(makeReq({}), { params: params as any });
    const init = (global.fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer newtok");
  });

  it("returns is_owner false when upstream not ok", async () => {
    mockVerifyUser.mockResolvedValue({ user: { sub: "1" } });
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params: params as any });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ is_owner: false, can_manage: false });
  });

  it("returns is_owner false when fetch rejects", async () => {
    mockVerifyUser.mockResolvedValue({ user: { sub: "1" } });
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const res = await GET(makeReq(), { params: params as any });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ is_owner: false, can_manage: false });
  });
});
