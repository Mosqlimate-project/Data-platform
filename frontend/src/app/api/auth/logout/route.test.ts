import { describe, it, expect, vi, beforeEach } from "vitest";

describe("app/api/auth/logout", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("clears cookies in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { POST } = await import("./route");
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const access = res.cookies.get("access_token");
    const refresh = res.cookies.get("refresh_token");
    expect(access?.value).toBe("");
    expect(access?.maxAge).toBe(0);
    expect(access?.httpOnly).toBe(true);
    expect(access?.secure).toBe(true);
    expect(access?.domain).toBeUndefined();
    expect(refresh?.value).toBe("");
  });

  it("uses mosqlimate domain in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("./route");
    const res = await POST();
    const access = res.cookies.get("access_token");
    expect(access?.domain).toBe(".mosqlimate.org");
  });
});
