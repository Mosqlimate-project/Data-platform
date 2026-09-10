import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProtectedLayout from "./layout";

const auth = vi.hoisted(() => ({
  user: null as any,
  loadingUser: false,
  openLogin: vi.fn(),
}));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({
    user: auth.user,
    loadingUser: auth.loadingUser,
    openLogin: auth.openLogin,
  }),
}));

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/admin",
}));

describe("app/(protected)/layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
    auth.loadingUser = false;
  });

  it("shows a spinner while loading the user", () => {
    auth.loadingUser = true;
    const { container } = render(
      <ProtectedLayout>
        <span>secret</span>
      </ProtectedLayout>
    );
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("renders children for an authenticated user", () => {
    auth.user = { username: "alice" };
    render(
      <ProtectedLayout>
        <span>secret</span>
      </ProtectedLayout>
    );
    expect(screen.getByText("secret")).toBeInTheDocument();
  });

  it("opens the login modal for anonymous users", () => {
    render(
      <ProtectedLayout>
        <span>secret</span>
      </ProtectedLayout>
    );
    expect(auth.openLogin).toHaveBeenCalled();
    expect(screen.queryByText("secret")).not.toBeInTheDocument();
  });

  it("redirects home on login-cancelled when anonymous", () => {
    render(
      <ProtectedLayout>
        <span>secret</span>
      </ProtectedLayout>
    );
    fireEvent(window, new Event("login-cancelled"));
    expect(nav.push).toHaveBeenCalledWith("/");
  });

  it("does not redirect on login-cancelled when authenticated", () => {
    auth.user = { username: "alice" };
    render(
      <ProtectedLayout>
        <span>secret</span>
      </ProtectedLayout>
    );
    fireEvent(window, new Event("login-cancelled"));
    expect(nav.push).not.toHaveBeenCalled();
  });
});
