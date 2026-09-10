import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = { access_token: "at" }, body: unknown = {}) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    json: async () => body,
  }) as any;

describe("app/api/registry/model/add", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({}));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 200 with body on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 1 }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq({ access_token: "at" }, { name: "m" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 1 });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/registry/model/add/");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer at");
    expect(JSON.parse(init.body)).toEqual({ name: "m" });
  });

  it("maps upstream error status and text", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad payload",
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "bad payload" });
  });

  it("maps upstream error with fallback message", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Backend Error" });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { POST } = await import("./route");
    const res = await POST(makeReq());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
