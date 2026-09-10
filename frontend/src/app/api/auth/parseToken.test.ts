// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SignJWT } from "jose";

const secret = "unit-test-secret-key-0123456789";

async function makeToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .sign(new TextEncoder().encode(secret));
}

describe("app/api/auth/parseToken", () => {
  beforeEach(() => {
    vi.stubEnv("SECRET_KEY", secret);
    vi.stubEnv("JWT_ALGORITHM", "HS256");
    vi.resetModules();
  });

  it("returns payload for a valid token", async () => {
    const { parseToken } = await import("./parseToken");
    const token = await makeToken({ sub: "7", type: "access" });
    const payload = await parseToken(token);
    expect(payload?.sub).toBe("7");
  });

  it("returns null when token missing sub", async () => {
    const { parseToken } = await import("./parseToken");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const token = await makeToken({ type: "access" });
    expect(await parseToken(token)).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("returns null for expired token", async () => {
    const { parseToken } = await import("./parseToken");
    const token = await makeToken({ sub: "7" });
    const { parseToken: pt } = await import("./parseToken");
    // Force expiry by using an already-expired token
    const expired = await new SignJWT({ sub: "7" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("0s")
      .sign(new TextEncoder().encode(secret));
    expect(await pt(expired)).toBeNull();
    void token;
  });

  it("returns null for an invalid token", async () => {
    const { parseToken } = await import("./parseToken");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await parseToken("garbage.token")).toBeNull();
    expect(err).toHaveBeenCalled();
  });

  it("throws when SECRET_KEY missing", async () => {
    vi.stubEnv("SECRET_KEY", "");
    vi.resetModules();
    const { parseToken } = await import("./parseToken");
    await expect(parseToken("x.y.z")).rejects.toThrow(
      "Missing SECRET_KEY environment variable"
    );
  });

  it("falls back to HS256 when JWT_ALGORITHM is missing", async () => {
    vi.stubEnv("JWT_ALGORITHM", "");
    vi.resetModules();
    const { parseToken } = await import("./parseToken");
    const token = await makeToken({ sub: "7", type: "access" });
    const payload = await parseToken(token);
    expect(payload?.sub).toBe("7");
  });
});
