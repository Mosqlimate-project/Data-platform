import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { TabNav, TabLink } from "./tabs";

describe("components/ui/tabs", () => {
  it("renders TabNav with children", () => {
    render(<TabNav>tabs</TabNav>);
    expect(screen.getByText("tabs")).toBeInTheDocument();
  });

  it("renders TabLink active", () => {
    render(<TabLink href="/x" isActive>Home</TabLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/x");
    expect(link.className).toContain("border-border");
  });

  it("renders TabLink inactive", () => {
    render(<TabLink href="/y">Away</TabLink>);
    const link = screen.getByRole("link");
    expect(link.className).toContain("border-transparent");
  });
});
