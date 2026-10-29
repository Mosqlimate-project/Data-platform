import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OwnerPage from "./page";

const env = vi.hoisted(() => ({ url: "https://front.example", secret: "shh" }));
vi.mock("@/lib/env", () => ({
  get NEXT_PUBLIC_FRONTEND_URL() {
    return env.url;
  },
  get FRONTEND_SECRET() {
    return env.secret;
  },
}));

const notFound = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  notFound,
}));

const userProfile = {
  owner: "alice",
  type: "user",
  display_name: "Alice",
  avatar_url: null,
  homepage: null,
  provider_url: null,
  members: [],
  repositories: [
    {
      name: "repo-one",
      provider: "github",
      url: "https://github.com/alice/repo-one",
      active: true,
      has_model: true,
      category: "quantitative",
      time_resolution: "week",
      description: "A test model",
      predictions: 42,
    },
  ],
};

const orgProfile = {
  owner: "acme",
  type: "organization",
  display_name: "Acme Org",
  avatar_url: "https://example.com/avatar.png",
  homepage: "https://acme.example",
  provider_url: "https://github.com/acme",
  members: [
    {
      username: "bob",
      display_name: "Bob",
      avatar_url: "https://example.com/bob.png",
      role: "owner",
    },
  ],
  repositories: [
    {
      name: "external-repo",
      provider: "gitlab",
      url: "https://gitlab.com/acme/external-repo",
      active: true,
      has_model: false,
      category: null,
      time_resolution: null,
      description: null,
      predictions: 0,
    },
  ],
};

const emptyOrgProfile = {
  ...orgProfile,
  members: [],
  repositories: [],
};

function mockFetch(body: unknown, status = 200) {
  global.fetch = vi.fn().mockResolvedValue({
    status,
    json: async () => body,
  }) as unknown as typeof fetch;
}

describe("app/[owner]/page", () => {
  beforeEach(() => {
    env.url = "https://front.example";
    env.secret = "shh";
    notFound.mockReset();
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a user profile and links model repositories", async () => {
    mockFetch(userProfile);

    const ui = await OwnerPage({
      params: Promise.resolve({ owner: "alice" }),
    });
    render(ui);

    expect(screen.getByRole("heading", { name: "Alice" })).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("User")).toBeInTheDocument();
    expect(screen.queryByText("Members")).not.toBeInTheDocument();

    const repoLink = screen.getByText("repo-one").closest("a");
    expect(repoLink).toHaveAttribute("href", "/alice/repo-one");
    expect(screen.getByText("Quantitative")).toBeInTheDocument();
    expect(screen.getByText("Week")).toBeInTheDocument();
    expect(screen.getByText("42 predictions")).toBeInTheDocument();

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://front.example/api/registry/model/alice/");
    expect(options.cache).toBe("no-store");
    expect(options.headers["x-internal-secret"]).toBe("shh");
  });

  it("renders an organization profile with members and external repos", async () => {
    mockFetch(orgProfile);

    const ui = await OwnerPage({
      params: Promise.resolve({ owner: "acme" }),
    });
    render(ui);

    expect(screen.getByRole("heading", { name: "Acme Org" })).toBeInTheDocument();
    expect(screen.getByText("Organization")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();

    const memberLink = screen.getByText("Bob").closest("a");
    expect(memberLink).toHaveAttribute("href", "/bob");

    const repoLink = screen.getByText("external-repo").closest("a");
    expect(repoLink).toHaveAttribute(
      "href",
      "https://gitlab.com/acme/external-repo"
    );
    expect(repoLink).toHaveAttribute("target", "_blank");
    expect(screen.getByText("View on provider")).toBeInTheDocument();
  });

  it("renders empty states for organizations without members or repos", async () => {
    mockFetch(emptyOrgProfile);

    const ui = await OwnerPage({
      params: Promise.resolve({ owner: "acme" }),
    });
    render(ui);

    expect(screen.getByText("No members yet.")).toBeInTheDocument();
    expect(screen.getByText("No active repositories yet.")).toBeInTheDocument();
  });

  it("calls notFound when the status is not 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 404 }) as unknown as typeof fetch;
    await expect(
      OwnerPage({ params: Promise.resolve({ owner: "nobody" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  it("omits the internal secret header when not configured", async () => {
    env.secret = "";
    mockFetch(userProfile);

    const ui = await OwnerPage({
      params: Promise.resolve({ owner: "alice" }),
    });
    render(ui);
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers["x-internal-secret"]).toBe("");
  });
});
