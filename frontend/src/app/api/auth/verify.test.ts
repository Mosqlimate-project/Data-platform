// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockParseToken = vi.hoisted(() => vi.fn());
const mockFetch = vi.hoisted(() => vi.fn());

vi.mock("./parseToken", () => ({
  parseToken: mockParseToken,
}));

vi.stubGlobal("fetch", mockFetch);

describe("app/api/auth/verify", () => {
  beforeEach(() => {
    vi.resetModules();
    mockParseToken.mockReset();
    mockFetch.mockReset();
  });

  const makeReq = (cookies: Record<string, string>) => {
    return {
      cookies: {
        get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
      },
    } as any;
  };

  it("returns user from access token", async () => {
    const { verifyUser } = await import("./verify");
    mockParseToken.mockResolvedValue({ sub: "1" });
    const result = await verifyUser(makeReq({ access_token: "at" }));
    expect(result?.user.sub).toBe("1");
  });

  it("returns null when no tokens", async () => {
    const { verifyUser } = await import("./verify");
    expect(await verifyUser(makeReq({}))).toBeNull();
  });

  it("refreshes when access invalid and refresh present", async () => {
    const { verifyUser } = await import("./verify");
    mockParseToken.mockImplementation(async (t: string) =>
      t === "newtoken" ? { sub: "2" } : null
    );
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "newtoken" }),
      headers: { getSetCookie: () => ["a=1; Path=/"] },
    });
    const result = await verifyUser(
      makeReq({ access_token: "at", refresh_token: "rt" })
    );
    expect(result?.user.sub).toBe("2");
    expect(result?.headers?.get("set-cookie")).toBe("a=1; Path=/");
  });

  it("returns null when refresh response not ok", async () => {
    const { verifyUser } = await import("./verify");
    mockParseToken.mockResolvedValue(null);
    mockFetch.mockResolvedValue({ ok: false });
    expect(
      await verifyUser(makeReq({ access_token: "at", refresh_token: "rt" }))
    ).toBeNull();
  });

  it("returns null when refresh token invalid", async () => {
    const { verifyUser } = await import("./verify");
    mockParseToken.mockResolvedValue(null);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "bad" }),
    });
    expect(
      await verifyUser(makeReq({ access_token: "at", refresh_token: "rt" }))
    ).toBeNull();
  });

  it("returns null and logs when fetch rejects", async () => {
    const { verifyUser } = await import("./verify");
    mockParseToken.mockResolvedValue(null);
    mockFetch.mockRejectedValue(new Error("network"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(
      await verifyUser(makeReq({ access_token: "at", refresh_token: "rt" }))
    ).toBeNull();
    expect(err).toHaveBeenCalled();
  });
});
