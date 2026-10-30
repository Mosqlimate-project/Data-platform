import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import OrganizationsPage from "./page";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push }),
}));

const githubOrganizations = [
  {
    name: "acme",
    provider: "github",
    avatar_url: null,
    imported: false,
  },
  {
    name: "team",
    provider: "github",
    avatar_url: "https://example.com/team.png",
    imported: true,
  },
];

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("app/(protected)/profile/organizations/page", () => {
  beforeEach(() => {
    nav.push.mockReset();
    global.fetch = vi.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists organizations and imports one", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse(githubOrganizations))
      .mockResolvedValueOnce(jsonResponse({ name: "acme" }));

    render(<OrganizationsPage />);

    expect(await screen.findByText("acme")).toBeInTheDocument();
    expect(screen.getByText("team")).toBeInTheDocument();
    expect(screen.getByText("profile_organizations.view")).toBeInTheDocument();

    const importButtons = screen.getAllByText("profile_organizations.import");
    fireEvent.click(importButtons[importButtons.length - 1]);

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/acme"));
    expect((global.fetch as any).mock.calls[1][0]).toBe(
      "/api/user/organizations/github/import"
    );
  });

  it("loads GitLab organizations when the tab changes", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse([
          {
            name: "gitlab-team",
            provider: "gitlab",
            avatar_url: null,
            imported: false,
          },
        ])
      );

    render(<OrganizationsPage />);

    expect(
      await screen.findByText("profile_organizations.empty")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("gitlab"));

    expect(await screen.findByText("gitlab-team")).toBeInTheDocument();
    expect((global.fetch as any).mock.calls[1][0]).toBe(
      "/api/user/organizations/gitlab"
    );
  });

  it("shows the GitHub App install action when no orgs are found", async () => {
    (global.fetch as any).mockResolvedValueOnce(jsonResponse([]));

    render(<OrganizationsPage />);

    const install = await screen.findByText(
      "profile_organizations.install_app"
    );
    expect(install.closest("a")).toHaveAttribute(
      "href",
      "/api/user/oauth/install/github?next=%2Fprofile%2Forganizations"
    );
  });

  it("shows a connect action when the provider is not connected", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ message: "not found" }, 404)
    );

    render(<OrganizationsPage />);

    expect(
      await screen.findByText("profile_organizations.not_connected")
    ).toBeInTheDocument();
    expect(
      screen.getByText("profile_organizations.manage_connections").closest("a")
    ).toHaveAttribute("href", "/profile/auth");
  });

  it("shows a load error", async () => {
    (global.fetch as any).mockResolvedValueOnce(
      jsonResponse({ message: "boom" }, 500)
    );

    render(<OrganizationsPage />);

    expect(
      await screen.findByText("profile_organizations.errors.load")
    ).toBeInTheDocument();
  });

  it("shows an import error", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse(githubOrganizations))
      .mockResolvedValueOnce(jsonResponse({ message: "denied" }, 403));

    render(<OrganizationsPage />);

    await screen.findByText("acme");
    const importButtons = screen.getAllByText("profile_organizations.import");
    fireEvent.click(importButtons[importButtons.length - 1]);

    expect(await screen.findByText("denied")).toBeInTheDocument();
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("imports an organization typed manually", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ name: "manual-org" }));

    render(<OrganizationsPage />);

    await screen.findByText("profile_organizations.empty");

    fireEvent.change(
      screen.getByPlaceholderText("profile_organizations.name_placeholder"),
      { target: { value: "manual-org" } }
    );
    fireEvent.click(screen.getByText("profile_organizations.import"));

    await waitFor(() =>
      expect(nav.push).toHaveBeenCalledWith("/manual-org")
    );
    expect((global.fetch as any).mock.calls[1][0]).toBe(
      "/api/user/organizations/github/import"
    );
  });
});
