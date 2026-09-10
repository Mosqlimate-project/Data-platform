import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string, body = "") =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
    text: async () => body,
  }) as any;

const ctx = { params: { path: ["charts", "climate", "temperature"] } };

describe("app/datastore/[...path]/route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("GET returns 401 when the secret is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(undefined), ctx);
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("GET returns 401 when the configured secret is empty", async () => {
    vi.stubEnv("FRONTEND_SECRET", "");
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), ctx);
    expect(res.status).toBe(401);
  });

  it("GET forwards the response body, status and content type", async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => JSON.stringify({ ok: true }),
      headers: { get: () => "application/json" },
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), ctx);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    expect(await res.text()).toBe(JSON.stringify({ ok: true }));

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("http://backend:8042/api/charts/climate/temperature");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("GET defaults the content type to application/json", async () => {
    (global.fetch as any).mockResolvedValue({
      status: 201,
      text: async () => "data",
      headers: { get: () => null },
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), ctx);
    expect(res.headers.get("Content-Type")).toBe("application/json");
  });

  it("GET rejects when the upstream fetch throws", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    await expect(GET(makeReq("fs"), ctx)).rejects.toThrow("boom");
  });

  it("POST forwards the body and returns the upstream response", async () => {
    (global.fetch as any).mockResolvedValue({
      status: 200,
      text: async () => "created",
      headers: { get: () => "text/plain" },
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq("fs", '{"a":1}'), ctx);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("created");

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("http://backend:8042/api/charts/climate/temperature");
    expect(options.method).toBe("POST");
    expect(options.body).toBe('{"a":1}');
  });

  it("POST propagates an upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({
      status: 500,
      text: async () => "err",
      headers: { get: () => null },
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq("fs", ""), ctx);
    expect(res.status).toBe(500);
  });

  it("POST rejects when the upstream fetch throws", async () => {
    (global.fetch as any).mockRejectedValue(new Error("down"));
    const { POST } = await import("./route");
    await expect(POST(makeReq("fs", ""), ctx)).rejects.toThrow("down");
  });
});
