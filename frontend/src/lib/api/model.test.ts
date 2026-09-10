import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookies = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => mockCookies),
}));

describe("lib/api/model getPermissions", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCookies.get.mockReset();
  });

  it("returns permissions with token header", async () => {
    mockCookies.get.mockReturnValue({ value: "tok" });
    const { getPermissions } = await import("./model");
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ can_manage: true }),
    }) as any;
    const result = await getPermissions("owner", "repo");
    expect(result).toEqual({ can_manage: true });
    const [url, opts] = (fetch as any).mock.calls[0];
    expect(url).toContain("/owner/repo/permissions/");
    expect(opts.headers.Authorization).toBe("Bearer tok");
  });

  it("returns can_manage false when response not ok", async () => {
    mockCookies.get.mockReturnValue(undefined);
    const { getPermissions } = await import("./model");
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as any;
    expect(await getPermissions("o", "r")).toEqual({ can_manage: false });
  });

  it("returns can_manage false when fetch rejects", async () => {
    mockCookies.get.mockReturnValue(undefined);
    const { getPermissions } = await import("./model");
    global.fetch = vi.fn().mockRejectedValue(new Error("network")) as any;
    expect(await getPermissions("o", "r")).toEqual({ can_manage: false });
  });
});
