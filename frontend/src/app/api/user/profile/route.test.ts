import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (
  cookies: Record<string, string> = { access_token: "at" },
  over: Record<string, unknown> = {}
) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    json: async () => ({}),
    ...over,
  }) as any;

describe("app/api/user/profile", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  describe("GET", () => {
    it("returns 401 when no token", async () => {
      const { GET } = await import("./route");
      const res = await GET(makeReq({}));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Unauthorized" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns profile on success", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ username: "bob" }),
      });
      const { GET } = await import("./route");
      const res = await GET(makeReq());
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ username: "bob" });
      const [url, init] = (global.fetch as any).mock.calls[0];
      expect(String(url)).toContain("/api/user/profile/");
      expect(init.method).toBe("GET");
    });

    it("maps upstream error status", async () => {
      (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
      const { GET } = await import("./route");
      const res = await GET(makeReq());
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ message: "Failed to fetch profile" });
    });

    it("returns 500 and logs when fetch rejects", async () => {
      (global.fetch as any).mockRejectedValue(new Error("boom"));
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      const { GET } = await import("./route");
      const res = await GET(makeReq());
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ message: "Internal Server Error" });
      expect(err).toHaveBeenCalled();
    });
  });

  describe("POST", () => {
    it("returns 401 when no token", async () => {
      const { POST } = await import("./route");
      const res = await POST(makeReq({}));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Unauthorized" });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("updates profile on success", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      const { POST } = await import("./route");
      const res = await POST(makeReq({ access_token: "at" }, { json: async () => ({ first_name: "A" }) }));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ ok: true });
      const init = (global.fetch as any).mock.calls[0][1];
      expect(init.method).toBe("POST");
      expect(JSON.parse(init.body)).toEqual({ first_name: "A" });
    });

    it("maps upstream error message", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: "invalid" }),
      });
      const { POST } = await import("./route");
      const res = await POST(makeReq());
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ message: "invalid" });
    });

    it("falls back to default error message", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("no json");
        },
      });
      const { POST } = await import("./route");
      const res = await POST(makeReq());
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ message: "Failed to update profile" });
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
});
