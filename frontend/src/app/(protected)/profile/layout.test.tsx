import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileLayout from "./layout";

const nav = vi.hoisted(() => ({ pathname: "/profile" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

describe("app/(protected)/profile/layout", () => {
  beforeEach(() => {
    nav.pathname = "/profile";
  });

  it("renders the sidebar and children", () => {
    render(
      <ProfileLayout>
        <span>child</span>
      </ProfileLayout>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: "Models" })).toHaveAttribute("href", "/profile/models");
    expect(screen.getByRole("link", { name: "Account" })).toHaveAttribute("href", "/profile/account");
    expect(screen.getByRole("link", { name: "Auth" })).toHaveAttribute("href", "/profile/auth");
  });

  it("marks the active link", () => {
    nav.pathname = "/profile/models";
    render(
      <ProfileLayout>
        <span>child</span>
      </ProfileLayout>
    );
    expect(screen.getByRole("link", { name: "Models" }).className).toContain("bg-blue-50");
    expect(screen.getByRole("link", { name: "Profile" }).className).not.toContain("bg-blue-50");
  });
});
