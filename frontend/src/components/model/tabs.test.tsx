import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ModelTabs } from "./tabs";

vi.mock("next/navigation", () => ({
  usePathname: () => "/owner/repo",
}));

describe("components/model/tabs", () => {
  it("renders readme and predictions links", () => {
    render(<ModelTabs owner="owner" repository="repo" />);
    const readme = screen.getByRole("link", { name: "Readme" });
    const preds = screen.getByRole("link", { name: "Predictions" });
    expect(readme).toHaveAttribute("href", "/owner/repo");
    expect(preds).toHaveAttribute("href", "/owner/repo/predictions");
  });

  it("marks readme active on the base path", () => {
    render(<ModelTabs owner="owner" repository="repo" />);
    const readme = screen.getByRole("link", { name: "Readme" });
    expect(readme.className).toContain("border-border");
  });
});
