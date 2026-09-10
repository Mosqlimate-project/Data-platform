import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (params: Record<string, string> = {}) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/user/check-username", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 400 when username is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Missing username parameter" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 500 when upstream not ok", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ username: "bob" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Backend error" });
  });

  it("returns 409 when username taken", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ available: false }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ username: "bob" }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ message: "Username already taken" });
  });

  it("returns 200 when available", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ available: true }),
    });
    const { GET } = await import("./route");
    const res = await GET(makeReq({ username: "bob" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ available: true });
  });

  it("returns 500 and logs when fetch rejects", async () => {
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { GET } = await import("./route");
    const res = await GET(makeReq({ username: "bob" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
