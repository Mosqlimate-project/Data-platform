import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (
  cookies: Record<string, string> = { access_token: "at" },
  over: Record<string, unknown> = {}
) =>
  ({
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    formData: async () => new FormData(),
    ...over,
  }) as any;

describe("app/api/user/profile/avatar", () => {
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

  it("uploads avatar on success", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ avatar: "url" }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ avatar: "url" });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(String(url)).toContain("/api/user/profile/avatar/");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer at");
  });

  it("maps upstream error message", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 413,
      json: async () => ({ message: "too big" }),
    });
    const { POST } = await import("./route");
    const res = await POST(makeReq());
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ message: "too big" });
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
    expect(await res.json()).toEqual({ message: "Failed to upload avatar" });
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
