import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
  }) as any;

const makeParams = (owner: string) => Promise.resolve({ owner });

describe("app/api/registry/model/[owner]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("ADMIN_UIDKEY", "u:k");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when secret missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(undefined), { params: makeParams("acme") });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 401 when secret mismatch", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq("wrong"), { params: makeParams("acme") });
    expect(res.status).toBe(401);
  });

  it("returns data on success and forwards owner", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ owner: "acme" }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), { params: makeParams("acme") });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ owner: "acme" });
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/registry/model/acme/");
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), { params: makeParams("acme") });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Failed to fetch repository owner" });
  });
});
