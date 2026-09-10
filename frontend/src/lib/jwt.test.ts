// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { SignJWT } from "jose";

describe("lib/jwt verifyJWT", () => {
  const secret = "unit-test-secret-key-0123456789";

  it("returns payload for a valid token", async () => {
    vi.stubEnv("SECRET_KEY", secret);
    vi.resetModules();
    const { verifyJWT } = await import("./jwt");
    const token = await new SignJWT({ sub: "1", type: "access" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(secret));
    const payload = await verifyJWT(token);
    expect(payload?.sub).toBe("1");
  });

  it("returns null for an invalid token", async () => {
    vi.stubEnv("SECRET_KEY", secret);
    vi.resetModules();
    const { verifyJWT } = await import("./jwt");
    expect(await verifyJWT("garbage.token.here")).toBeNull();
  });

  it("returns null when verification throws", async () => {
    vi.stubEnv("SECRET_KEY", secret);
    vi.resetModules();
    const { verifyJWT } = await import("./jwt");
    const wrong = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .sign(new TextEncoder().encode("different-secret"));
    expect(await verifyJWT(wrong)).toBeNull();
  });
});
