import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  NEXT_PUBLIC_FRONTEND_URL: "https://example.org/",
}));

import robots from "./robots";

describe("app/robots", () => {
  it("allows public pages and points to the sitemap", () => {
    const result = robots();

    expect(result.rules).toEqual({
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/oauth/", "/dashboard", "/profile", "/admin"],
    });
    expect(result.sitemap).toBe("https://example.org/sitemap.xml");
    expect(result.host).toBe("https://example.org");
  });
});
