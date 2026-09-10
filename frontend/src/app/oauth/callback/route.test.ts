import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (params: Record<string, string> = {}) =>
  ({ url: `https://app.test/oauth/callback?${new URLSearchParams(params)}` }) as any;

describe("app/oauth/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("redirects with missing_data error when no data", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.headers.get("location")).toContain(
      "/oauth/login?error=missing_data"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects with invalid_token when decode fails", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400 });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.headers.get("location")).toContain(
      "/oauth/login?error=invalid_token"
    );
    expect(err).toHaveBeenCalled();
  });

  it("redirects to register when action is register", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ action: "register" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.headers.get("location")).toContain("/oauth/register");
    expect(res.headers.get("location")).toContain("data=abc");
  });

  it("redirects with missing_tokens when tokens absent", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ next: "/dashboard" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.headers.get("location")).toContain(
      "/oauth/login?error=missing_tokens"
    );
  });

  it("redirects to next and sets tokens on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at",
        refresh_token: "rt",
        next: "/dashboard",
      }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/dashboard");
    expect(res.cookies.get("access_token")?.value).toBe("at");
    expect(res.cookies.get("refresh_token")?.value).toBe("rt");
  });

  it("redirects to the root when no next is provided", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: "at",
        refresh_token: "rt",
      }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).not.toContain("/dashboard");
    expect(res.headers.get("location")).toMatch(/\/$/);
  });

  it("redirects with server_error and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.headers.get("location")).toContain(
      "/oauth/login?error=server_error"
    );
    expect(err).toHaveBeenCalled();
  });
});
