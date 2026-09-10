import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookies = vi.hoisted(() => ({
  toString: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookies),
}));

const makeReq = (body: unknown = {}) =>
  ({
    json: async () => body,
  }) as any;

const makeParams = (owner: string, repository: string) =>
  Promise.resolve({ owner, repository });

describe("app/api/registry/model/[owner]/[repository]/description", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCookies.toString.mockReset();
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns success on valid response", async () => {
    mockCookies.toString.mockReturnValue("access_token=at");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq({ description: "d" }), {
      params: makeParams("acme", "repo"),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/registry/model/acme/repo/description/");
    expect(init.method).toBe("PATCH");
    expect(init.headers.Cookie).toBe("access_token=at");
    expect(JSON.parse(init.body)).toEqual({ description: "d" });
  });

  it("maps upstream error status and message", async () => {
    mockCookies.toString.mockReturnValue("");
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "bad" }),
    });
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: makeParams("acme", "repo") });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "bad" });
  });

  it("falls back to default error message", async () => {
    mockCookies.toString.mockReturnValue("");
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no json");
      },
    });
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: makeParams("acme", "repo") });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Failed to update description" });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    mockCookies.toString.mockReturnValue("");
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: makeParams("acme", "repo") });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
