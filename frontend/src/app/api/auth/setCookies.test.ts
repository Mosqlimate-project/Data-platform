import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

describe("app/api/auth/setCookies", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets access and refresh cookies (non-prod)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("JWT_TOKEN_EXPIRE_MINUTES", "30");
    vi.stubEnv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7");
    vi.resetModules();
    const { setTokens } = await import("./setCookies");
    const res = NextResponse.json({});
    setTokens(res, { accessToken: "at", refreshToken: "rt" });
    const access = res.cookies.get("access_token");
    const refresh = res.cookies.get("refresh_token");
    expect(access?.value).toBe("at");
    expect(access?.maxAge).toBe(1800);
    expect(access?.httpOnly).toBe(true);
    expect(access?.secure).toBe(false);
    expect(refresh?.value).toBe("rt");
    expect(refresh?.maxAge).toBe(604800);
  });

  it("sets secure cookies with domain in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_TOKEN_EXPIRE_MINUTES", "30");
    vi.stubEnv("JWT_REFRESH_TOKEN_EXPIRE_DAYS", "7");
    vi.resetModules();
    const { setTokens } = await import("./setCookies");
    const res = NextResponse.json({});
    setTokens(res, { accessToken: "at", refreshToken: "rt" });
    const access = res.cookies.get("access_token");
    expect(access?.secure).toBe(true);
    expect(access?.domain).toBe(".mosqlimate.org");
  });
});
