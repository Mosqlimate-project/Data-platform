import { describe, it, expect } from "vitest";
import i18n from "./i18n";

describe("lib/i18n", () => {
  it("initializes with common namespace and fallback en", async () => {
    await i18n.init();
    expect(i18n.hasResourceBundle("en", "common")).toBe(true);
    expect(i18n.hasResourceBundle("pt", "common")).toBe(true);
    expect(i18n.hasResourceBundle("es", "common")).toBe(true);
    expect(i18n.t("app.title", { defaultValue: "x" })).toBeDefined();
  });
});
