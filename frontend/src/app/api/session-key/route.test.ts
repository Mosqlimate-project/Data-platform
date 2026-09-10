import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (cookies: Record<string, string> = {}) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
  }) as any;

const upstream = (over: Record<string, unknown> = {}) => ({
  status: 200,
  text: async () => JSON.stringify({ ok: true }),
  headers: { get: () => null },
  ...over,
});

describe("app/api/session-key", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("proxies without auth headers when no cookies", async () => {
    (global.fetch as any).mockResolvedValue(upstream());
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const init = (global.fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBeUndefined();
    expect(init.headers.Cookie).toBeUndefined();
  });

  it("forwards access token and session id", async () => {
    (global.fetch as any).mockResolvedValue(
      upstream({
        status: 201,
        text: async () => "hello",
        headers: { get: (k: string) => (k === "Content-Type" ? "text/plain" : null) },
      })
    );
    const { GET } = await import("./route");
    const res = await GET(makeReq({ access_token: "at", sessionid: "sid" }));
    expect(res.status).toBe(201);
    expect(await res.text()).toBe("hello");
    expect(res.headers.get("Content-Type")).toBe("text/plain");
    const init = (global.fetch as any).mock.calls[0][1];
    expect(init.headers.Authorization).toBe("Bearer at");
    expect(init.headers.Cookie).toBe("sessionid=sid");
  });

  it("propagates set-cookie from upstream", async () => {
    (global.fetch as any).mockResolvedValue(
      upstream({
        headers: {
          get: (k: string) => (k === "set-cookie" ? "sessionid=abc; Path=/" : null),
        },
      })
    );
    const { GET } = await import("./route");
    const res = await GET(makeReq({ access_token: "at" }));
    expect(res.headers.get("set-cookie")).toBe("sessionid=abc; Path=/");
  });

  it("returns 502 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ access_token: "at" }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ message: "Upstream request failed" });
    expect(err).toHaveBeenCalled();
  });
});
