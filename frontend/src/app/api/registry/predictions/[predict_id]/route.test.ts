import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookies = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => mockCookies),
}));

const makeReq = (secret?: string) =>
  ({
    headers: {
      get: (name: string) =>
        name === "x-internal-secret" ? secret : null,
    },
  }) as any;

const params = { predict_id: "99" };

describe("app/api/registry/predictions/[predict_id]", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCookies.get.mockReset();
    vi.stubEnv("FRONTEND_SECRET", "fs");
    vi.stubEnv("ADMIN_UIDKEY", "u:k");
    vi.stubEnv("BACKEND_PORT", "8042");
    global.fetch = vi.fn() as any;
  });

  describe("GET", () => {
    it("returns 401 when secret missing", async () => {
      const { GET } = await import("./route");
      const res = await GET(makeReq(undefined), { params: params as any });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Unauthorized [f]" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns 500 when ADMIN_UIDKEY missing", async () => {
      vi.stubEnv("ADMIN_UIDKEY", "");
      const { GET } = await import("./route");
      const res = await GET(makeReq("fs"), { params: params as any });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ message: "Server not configured" });
    });

    it("returns body with upstream status on success", async () => {
      (global.fetch as any).mockResolvedValue({
        status: 200,
        text: async () => "ok",
        headers: new Headers(),
      });
      const { GET } = await import("./route");
      const res = await GET(makeReq("fs"), { params: params as any });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("ok");
      const url = String((global.fetch as any).mock.calls[0][0]);
      expect(url).toContain("/api/registry/predictions/99/");
    });

    it("returns 502 and logs when fetch rejects", async () => {
      (global.fetch as any).mockRejectedValue(new Error("boom"));
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const { GET } = await import("./route");
      const res = await GET(makeReq("fs"), { params: params as any });
      expect(res.status).toBe(502);
      expect(await res.json()).toEqual({ message: "Upstream request failed" });
      expect(err).toHaveBeenCalled();
    });
  });

  describe("DELETE", () => {
    it("returns 401 when no tokens", async () => {
      mockCookies.get.mockImplementation(() => undefined);
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: params as any });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Unauthorized: No tokens found" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("deletes using api key on success", async () => {
      mockCookies.get.mockImplementation((name: string) =>
        name === "access_token" ? { value: "at" } : { value: "sess" }
      );
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ api_key: "apikey" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          text: async () => "deleted",
          headers: new Headers(),
        });
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: params as any });
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("deleted");
      const [keyUrl, keyInit] = (global.fetch as any).mock.calls[0];
      expect(String(keyUrl)).toContain("/api/user/api-key/");
      expect(keyInit.headers.Authorization).toBe("Bearer at");
      const [delUrl, delInit] = (global.fetch as any).mock.calls[1];
      expect(String(delUrl)).toContain("/api/registry/predictions/99/");
      expect(delInit.method).toBe("DELETE");
      expect(delInit.headers["X-UID-Key"]).toBe("apikey");
    });

    it("uses sessionid cookie when no access token", async () => {
      mockCookies.get.mockImplementation((name: string) =>
        name === "access_token" ? undefined : { value: "sess" }
      );
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ api_key: "apikey" }),
        })
        .mockResolvedValueOnce({
          status: 200,
          text: async () => "deleted",
          headers: new Headers(),
        });
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: params as any });
      expect(res.status).toBe(200);
      const keyInit = (global.fetch as any).mock.calls[0][1];
      expect(keyInit.headers.Cookie).toBe("sessionid=sess");
    });

    it("maps api key error status", async () => {
      mockCookies.get.mockImplementation((name: string) =>
        name === "access_token" ? { value: "at" } : undefined
      );
      (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 401 });
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: params as any });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Failed to retrieve API Key" });
    });

    it("returns 500 and logs when fetch rejects", async () => {
      mockCookies.get.mockImplementation((name: string) =>
        name === "access_token" ? { value: "at" } : undefined
      );
      (global.fetch as any).mockRejectedValue(new Error("boom"));
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const { DELETE } = await import("./route");
      const res = await DELETE(makeReq(), { params: params as any });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ message: "Internal server error" });
      expect(err).toHaveBeenCalled();
    });
  });
});
