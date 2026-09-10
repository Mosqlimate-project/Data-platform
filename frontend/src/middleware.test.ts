// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockVerifyUser = vi.hoisted(() => vi.fn());

vi.mock("@/app/api/auth/verify", () => ({
  verifyUser: mockVerifyUser,
}));

function makeNextRequest(pathname: string) {
  return {
    nextUrl: { pathname },
    headers: new Headers(),
  } as any;
}

describe("middleware", () => {
  beforeEach(() => {
    vi.stubEnv("FRONTEND_SECRET", "frontsecret");
    vi.stubEnv("FRONTEND_PREFIX", "");
    vi.resetModules();
    mockVerifyUser.mockReset();
  });

  it("allows public paths without verifying", async () => {
    const { middleware } = await import("./middleware");
    const res = await middleware(makeNextRequest("/models"));
    expect(res.status).toBe(200);
    expect(mockVerifyUser).not.toHaveBeenCalled();
  });

  it("allows root path", async () => {
    const { middleware } = await import("./middleware");
    const res = await middleware(makeNextRequest("/"));
    expect(res.status).toBe(200);
  });

  it("returns next for verified non-api path", async () => {
    const { middleware } = await import("./middleware");
    mockVerifyUser.mockResolvedValue({ user: {} });
    const res = await middleware(makeNextRequest("/dashboard"));
    expect(res.status).toBe(200);
  });

  it("returns 401 for non-public api path when unauthenticated", async () => {
    const { middleware } = await import("./middleware");
    mockVerifyUser.mockResolvedValue(null);
    const res = await middleware(makeNextRequest("/api/user/profile"));
    expect(res.status).toBe(401);
  });

  it("passes through for non-api path when unauthenticated", async () => {
    const { middleware } = await import("./middleware");
    mockVerifyUser.mockResolvedValue(null);
    const res = await middleware(makeNextRequest("/dashboard"));
    expect(res.status).toBe(200);
  });

  it("propagates set-cookie from verified user", async () => {
    const { middleware } = await import("./middleware");
    const headers = new Headers();
    headers.append("set-cookie", "a=1; Path=/");
    mockVerifyUser.mockResolvedValue({ user: {}, headers });
    const res = await middleware(makeNextRequest("/dashboard"));
    expect(res.headers.get("set-cookie")).toContain("a=1");
  });
});
