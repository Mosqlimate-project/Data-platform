import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  NEXT_PUBLIC_FRONTEND_URL: "https://example.org/",
}));

import sitemap from "./sitemap";

describe("app/sitemap", () => {
  it("lists only public routes with canonical URLs", () => {
    const result = sitemap();

    expect(result.map((entry) => entry.url)).toEqual([
      "https://example.org",
      "https://example.org/about",
      "https://example.org/datastore",
      "https://example.org/models",
      "https://example.org/publications",
      "https://example.org/privacy",
      "https://example.org/terms",
      "https://example.org/register",
    ]);
    expect(result.every((entry) => entry.lastModified instanceof Date)).toBe(true);

    const [home, about] = result;
    expect(home.changeFrequency).toBe("daily");
    expect(home.priority).toBe(1);
    expect(about.changeFrequency).toBe("weekly");
    expect(about.priority).toBe(0.7);
  });
});
