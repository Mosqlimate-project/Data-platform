import { describe, it, expect, vi, beforeEach } from "vitest";

const makeReq = (params: Record<string, string> = {}) =>
  ({
    nextUrl: { searchParams: new URLSearchParams(params) },
  }) as any;

describe("app/api/auth/decode", () => {
  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn() as any;
  });

  it("returns 400 when data is missing", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Missing data parameter" });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns 400 when upstream not ok", async () => {
    const { GET } = await import("./route");
    (global.fetch as any).mockResolvedValue({ ok: false, status: 404 });
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ message: "Invalid or expired token" });
  });

  it("returns decoded payload on success", async () => {
    const { GET } = await import("./route");
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "at" }),
    });
    const res = await GET(makeReq({ data: "a b" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ access_token: "at" });
    const url = String((global.fetch as any).mock.calls[0][0]);
    expect(url).toContain("data=a%20b");
  });

  it("returns 500 and logs when fetch rejects", async () => {
    const { GET } = await import("./route");
    (global.fetch as any).mockRejectedValue(new Error("boom"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await GET(makeReq({ data: "abc" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ message: "Internal Server Error" });
    expect(err).toHaveBeenCalled();
  });
});
