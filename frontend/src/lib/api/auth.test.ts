import { describe, it, expect, vi, beforeEach } from "vitest";

describe("lib/api/auth", () => {
  beforeEach(() => {
    vi.resetModules();
    delete (global as any).window.location;
  });

  it("oauthLogin redirects with provider and next", async () => {
    const { oauthLogin } = await import("./auth");
    const location = { href: "" };
    (global as any).window = { location };
    oauthLogin("google", "https://x.dev/dashboard");
    expect(location.href).toContain(
      "/api/user/oauth/login/google/?next=https%3A%2F%2Fx.dev%2Fdashboard"
    );
  });

  it("oauthLogin redirects without next", async () => {
    const { oauthLogin } = await import("./auth");
    const location = { href: "" };
    (global as any).window = { location };
    oauthLogin("github");
    expect(location.href).toContain("?next=");
  });

  it("csrfToken returns token from response", async () => {
    const { csrfToken } = await import("./auth");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ csrf_token: "csrf123" }),
    }) as any;
    expect(await csrfToken()).toBe("csrf123");
  });

  it("csrfToken falls back to cookie", async () => {
    const { csrfToken } = await import("./auth");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    }) as any;
    Object.defineProperty(document, "cookie", {
      value: "csrftoken=cookietok; other=1",
      configurable: true,
    });
    expect(await csrfToken()).toBe("cookietok");
  });

  it("csrfToken throws when response not ok", async () => {
    const { csrfToken } = await import("./auth");
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
    }) as any;
    await expect(csrfToken()).rejects.toThrow("Failed to get CSRF token: 403");
  });

  it("csrfToken throws when no token found", async () => {
    const { csrfToken } = await import("./auth");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({}),
    }) as any;
    Object.defineProperty(document, "cookie", {
      value: "other=1",
      configurable: true,
    });
    await expect(csrfToken()).rejects.toThrow(
      "CSRF token not found in response or cookies"
    );
  });
});
