import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (params: Record<string, string> = {}) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/user/check-email", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 400 when email is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Missing email parameter" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 500 when upstream not ok", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ email: "a@b.c" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Backend error" });
  });

  it("returns 409 when email already registered", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ available: false }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ email: "a@b.c" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ message: "Email already registered" });
  });

  it("returns 200 when available", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ email: "a@b.c" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true });
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("email=a%40b.c");
  });
});
