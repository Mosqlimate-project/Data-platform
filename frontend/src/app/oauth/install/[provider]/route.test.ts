import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (
  cookies: Record<string, string> = {},
  params: Record<string, string> = {},
  url = "https://app.test/oauth/install/github"
) =>
  ({
    url,
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

const params = { params: { provider: "github" } };

describe("app/oauth/install/[provider]", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("redirects to next with requires_auth cookie when no token", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq({}, { next: "/dashboard" }), params as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(res.cookies.get("requires_auth")?.value).toBe("true");
    expect(res.cookies.get("requires_auth")?.httpOnly).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects to root with requires_auth when no token and no next", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(), params as any);
    expect(res.headers.get("location")).toContain("app.test");
    expect(res.cookies.get("requires_auth")?.value).toBe("true");
  });

  it("redirects to upstream url on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ url: "https://github.com/apps/setup" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ access_token: "at" }, { next: "/x" }), params as any);
    expect(res.headers.get("location")).toBe("https://github.com/apps/setup");
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/user/oauth/install/github/");
    expect(url).toContain("next=%2Fx");
  });

  it("redirects with install_init_failed when upstream not ok", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400, text: async () => "bad" });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ access_token: "at" }), params as any);
    expect(res.headers.get("location")).toContain("/?error=install_init_failed");
    expect(err).toHaveBeenCalled();
  });

  it("redirects with server_error and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ access_token: "at" }), params as any);
    expect(res.headers.get("location")).toContain("/?error=server_error");
    expect(err).toHaveBeenCalled();
  });
});
