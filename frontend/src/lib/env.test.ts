import { describe, it, expect, vi } from "vitest";

describe("lib/env", () => {
  it("uses env vars and defaults", async () => {
    vi.stubEnv("FRONTEND_URL", "https://front.example");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "https://back.example");
    vi.stubEnv("FRONTEND_PORT", "3000");
    vi.stubEnv("BACKEND_PORT", "8042");
    vi.stubEnv("ADMIN_UIDKEY", "u:k");
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("SECRET_KEY", "sk");
    vi.resetModules();
    const env = await import("./env");
    expect(env.NEXT_PUBLIC_FRONTEND_URL).toBe("https://front.example");
    expect(env.NEXT_PUBLIC_BACKEND_URL).toBe("https://back.example");
    expect(env.FRONTEND_PORT).toBe("3000");
    expect(env.BACKEND_BASE_URL).toBe("http://backend:8042");
    expect(env.BACKEND_PORT).toBe("8042");
    expect(env.ADMIN_UIDKEY).toBe("u:k");
    expect(env.FRONTEND_SECRET).toBe("fs");
    expect(env.SECRET_KEY).toBe("sk");
    expect(env.JWT_ALGORITHM).toBe("HS256");
    expect(env.JWT_TOKEN_EXPIRE_MINUTES).toBe(30);
    expect(env.JWT_REFRESH_TOKEN_EXPIRE_DAYS).toBe(7);
  });

  it("falls back to defaults when env unset", async () => {
    vi.stubEnv("FRONTEND_URL", "");
    vi.stubEnv("NEXT_PUBLIC_BACKEND_URL", "");
    vi.resetModules();
    const env = await import("./env");
    expect(env.NEXT_PUBLIC_FRONTEND_URL).toBe("https://mosqlimate.org");
    expect(env.NEXT_PUBLIC_BACKEND_URL).toBe("https://api.mosqlimate.org");
  });
});
