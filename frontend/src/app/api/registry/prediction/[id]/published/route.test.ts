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

const makeParams = (id: string) => Promise.resolve({ id });

describe("app/api/registry/prediction/[id]/published", () => {
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
    const res = await PATCH(makeReq({ published: true }), {
      params: makeParams("42"),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/registry/prediction/42/published/");
    expect(init.method).toBe("PATCH");
    expect(init.headers.Cookie).toBe("access_token=at");
    expect(JSON.parse(init.body)).toEqual({ published: true });
  });

  it("maps upstream error status", async () => {
    mockCookies.toString.mockReturnValue("");
    (global.fetch as any).mockResolvedValue({ ok: false, status: 403 });
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: makeParams("42") });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "Failed to update status" });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    mockCookies.toString.mockReturnValue("");
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { PATCH } = await import("./route");
    const res = await PATCH(makeReq(), { params: makeParams("42") });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
