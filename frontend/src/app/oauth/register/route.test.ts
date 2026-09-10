import { describe, it, expect, vi, beforeEach } from "vitest";

describe("app/oauth/register", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("redirects with missing_data error when no data", async () => {
    const { GET } = await import("./route");
    const res = await GET(new Request("https://app.test/oauth/register") as any);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/register");
    expect(res.headers.get("location")).toContain("error=missing_data");
  });

  it("forwards data param when present", async () => {
    const { GET } = await import("./route");
    const res = await GET(
      new Request("https://app.test/oauth/register?data=xyz") as any
    );
    expect(res.headers.get("location")).toContain("/register");
    expect(res.headers.get("location")).toContain("data=xyz");
  });
});
