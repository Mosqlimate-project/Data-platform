import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (
  secret?: string,
  cookies: Record<string, string> = { access_token: "at" },
  body: unknown = {}
) =>
  ({
    headers: {
      get: (name: string) =>
        name === "x-internal-secret" ? secret : null,
    },
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    json: async () => body,
  }) as any;

const makeParams = (owner: string, repository: string) =>
  Promise.resolve({ owner, repository });

describe("app/api/registry/model/[owner]/[repository]", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  describe("GET", () => {
    it("returns 401 when secret missing", async () => {
      const { GET } = await import("./route");
      const res = await GET(makeReq(undefined), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns data with auth header when token present", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ name: "repo" }),
      });
      const { GET } = await import("./route");
      const res = await GET(makeReq("fs"), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ name: "repo" });
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(String(url)).toContain("/api/registry/model/acme/repo/");
      expect(init.headers.Authorization).toBe("Bearer at");
    });

    it("omits auth header when no token", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      const { GET } = await import("./route");
      await GET(makeReq("fs", {}), { params: makeParams("acme", "repo") });
      const init = (global.fetch as any).mock.calls[0][1];
      expect(init.headers.Authorization).toBeUndefined();
    });

    it("maps upstream error using backend message", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ message: "forbidden" }),
      });
      const { GET } = await import("./route");
      const res = await GET(makeReq("fs"), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(403);
      expect(await res.json()).toEqual({ error: "forbidden" });
    });

    it("maps upstream error with fallback", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => {
          throw new Error("bad json");
        },
      });
      const { GET } = await import("./route");
      const res = await GET(makeReq("fs"), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Failed to fetch model repository" });
    });
  });

  describe("PATCH", () => {
    it("returns 401 when no token", async () => {
      const { PATCH } = await import("./route");
      const res = await PATCH(makeReq("fs", {}), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Authentication required" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns patched data on success", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ updated: true }),
      });
      const { PATCH } = await import("./route");
      const res = await PATCH(makeReq("fs", { access_token: "at" }, { description: "d" }), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ updated: true });
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(String(url)).toContain("/api/registry/model/acme/repo/");
      expect(init.method).toBe("PATCH");
      expect(JSON.parse(init.body)).toEqual({ description: "d" });
    });

    it("maps upstream error status", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "bad" }),
      });
      const { PATCH } = await import("./route");
      const res = await PATCH(makeReq(), { params: makeParams("acme", "repo") });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "bad" });
    });

    it("returns 500 and logs when fetch rejects", async () => {
      (global.fetch as any).mockRejectedValue(new Error("boom"));
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const { PATCH } = await import("./route");
      const res = await PATCH(makeReq(), { params: makeParams("acme", "repo") });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: "Internal server error" });
      expect(err).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 401 when no token", async () => {
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq("fs", {}), {
        params: makeParams("acme", "repo"),
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Authentication required" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns deleted data on success", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ deleted: true }),
      });
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: makeParams("acme", "repo") });
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ deleted: true });
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(String(url)).toContain("/api/registry/model/acme/repo/");
      expect(init.method).toBe("DELETE");
    });

    it("maps upstream error status", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({}),
      });
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: makeParams("acme", "repo") });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: "Delete failed" });
    });
  });
});
