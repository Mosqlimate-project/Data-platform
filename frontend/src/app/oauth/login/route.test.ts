import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (params: Record<string, string> = {}, url = "https://app.test/oauth/login") =>
  ({
    url,
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/oauth/login", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("redirects with missing_data error when no data param", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(
      "/oauth/login?error=missing_data"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("redirects with invalid_token when decode fails", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 400 });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.headers.get("location")).toContain(
      "/oauth/login?error=invalid_token"
    );
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
    const fetchUrl = String((global.fetch as any).mock.calls[0][0]);
    expect(fetchUrl).toContain("/api/auth/decode");
  });

  it("redirects to root when no next", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "at", refresh_token: "rt" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.headers.get("location")).toContain("app.test");
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
