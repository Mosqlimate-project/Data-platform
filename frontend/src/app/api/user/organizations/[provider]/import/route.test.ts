import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (
  cookies: Record<string, string> = { access_token: "at" },
  body: unknown = { name: "acme" }
) =>
  ({
    cookies: {
      get: (name: string) =>
        cookies[name] ? { value: cookies[name] } : undefined,
    },
    json: async () => body,
  }) as any;

const params = Promise.resolve({ provider: "github" });

describe("app/api/user/organizations/[provider]/import", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when no token", async () => {
    const { POST } = await import("./route");
    const res = await POST(makeReq({}), { params });
    expect(res.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("imports an organization", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ name: "acme", imported: true }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ name: "acme", imported: true });
    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/user/organizations/github/import/");
    expect(options.method).toBe("POST");
  });

  it("maps upstream errors", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "denied" }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ message: "denied" });
  });

  it("falls back when the error body is invalid", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("bad json");
      },
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq(), { params });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      message: "Failed to import organization",
    });
  });

  it("returns 500 when the request body is invalid", async () => {
    const { POST } = await import("./route");
    const req = makeReq();
    req.json = async () => {
      throw new Error("bad body");
    };
    const res = await POST(req, { params });
    expect(res.status).toBe(500);
  });
});
