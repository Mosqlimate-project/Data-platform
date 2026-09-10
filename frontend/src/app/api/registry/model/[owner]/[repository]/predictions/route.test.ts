import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (secret?: string) =>
  ({
    headers: {
      get: (name: string) => (name === "x-internal-secret" ? secret : null),
    },
  }) as any;

const params = { owner: "acme", repository: "repo" };

describe("app/api/registry/model/[owner]/[repository]/predictions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("ADMIN_UIDKEY", "u:k");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  it("returns 401 when secret missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq(undefined), { params: params as any });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns data on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [{ id: 1 }],
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), { params: params as any });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 1 }]);
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("/api/registry/model/acme/repo/predictions/");
  });

  it("maps upstream error status", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), { params: params as any });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Failed to fetch model predictions" });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq("fs"), { params: params as any });
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
