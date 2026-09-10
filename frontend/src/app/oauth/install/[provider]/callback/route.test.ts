import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (params: Record<string, string> = {}) =>
  ({ url: `https://app.test/oauth/install/github/callback?${new URLSearchParams(params)}` }) as any;

const makeParams = (provider: string) => ({ params: Promise.resolve({ provider }) });

describe("app/oauth/install/[provider]/callback", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("redirects with missing_data when no data", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(), makeParams("github") as any);
    expect(res.headers.get("location")).toContain("/?error=missing_data");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects with invalid_token when decode fails", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400 });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }), makeParams("github") as any);
    expect(res.headers.get("location")).toContain("/?error=invalid_token");
    expect(err).toHaveBeenCalled();
  });

  it("redirects to next when github app installed", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ next: "/dashboard", action: "github_app_installed" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }), makeParams("github") as any);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("redirects to next when provider is github", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ next: "/dashboard", action: "other" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }), makeParams("github") as any);
    expect(res.headers.get("location")).toContain("/dashboard");
  });

  it("redirects to root for other providers", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ next: "/dashboard", action: "other" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }), makeParams("gitlab") as any);
    expect(res.headers.get("location")).toContain("mosqlimate.org/");
  });

  it("redirects to root when no next", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ action: "github_app_installed" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }), makeParams("github") as any);
    expect(res.headers.get("location")).toContain("mosqlimate.org/");
  });

  it("redirects with server_error and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }), makeParams("github") as any);
    expect(res.headers.get("location")).toContain("/?error=server_error");
    expect(err).toHaveBeenCalled();
  });
});
