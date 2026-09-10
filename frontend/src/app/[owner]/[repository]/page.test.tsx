import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ReadmePage from "./page";

vi.mock("@/lib/env", () => ({
  get BACKEND_BASE_URL() {
    return "http://backend:8042";
  },
}));

const cookieGet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const getPermissions = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/model", () => ({ getPermissions }));

const markdown = vi.hoisted(() => ({ props: null as any }));
vi.mock("@/components/model/MarkdownRenderer", () => ({
  default: (props: any) => {
    markdown.props = props;
    return <div data-testid="markdown">{props.content}</div>;
  },
}));

const sidebar = vi.hoisted(() => ({ props: null as any }));
vi.mock("@/components/model/ModelSidebar", () => ({
  default: (props: any) => {
    sidebar.props = props;
    return <div data-testid="sidebar" />;
  },
}));

const params = Promise.resolve({ owner: "alice", repository: "repo" });
const details = {
  description: "desc",
  contributors: [{ username: "bob" }],
  github_url: "https://github.com/alice/repo",
  disease: "dengue",
  category: "quantitative",
  adm_level: 1,
  time_resolution: "weekly",
  license: "MIT",
};

describe("app/[owner]/[repository]/page", () => {
  beforeEach(() => {
    cookieGet.mockReturnValue(undefined);
    getPermissions.mockResolvedValue({ can_manage: true });
    markdown.props = null;
    sidebar.props = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the readme and sidebar", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/readme/")) return Promise.resolve({ ok: true, json: async () => ({ content: "# Hello" }) });
      return Promise.resolve({ ok: true, json: async () => details });
    }) as unknown as typeof fetch;

    const ui = await ReadmePage({ params });
    render(ui);
    expect(screen.getByTestId("markdown")).toHaveTextContent("# Hello");
    expect(markdown.props.owner).toBe("alice");
    expect(sidebar.props.canManage).toBe(true);
    expect(sidebar.props.githubUrl).toBe("https://github.com/alice/repo");
  });

  it("shows a not found message when details fail", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    const ui = await ReadmePage({ params });
    render(ui);
    expect(screen.getByText("Model not found")).toBeInTheDocument();
  });

  it("shows a placeholder when there is no readme", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/readme/")) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => ({ ...details, github_url: undefined, html_url: "https://html" }) });
    }) as unknown as typeof fetch;

    const ui = await ReadmePage({ params });
    render(ui);
    expect(screen.getByText("No README available for this model.")).toBeInTheDocument();
    expect(sidebar.props.githubUrl).toBe("https://html");
  });

  it("adds an authorization header when a token exists", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/readme/")) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => details });
    }) as unknown as typeof fetch;

    await ReadmePage({ params });
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok");
  });

  it("defaults canManage to false when permissions are missing", async () => {
    getPermissions.mockResolvedValue(null);
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/readme/")) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => details });
    }) as unknown as typeof fetch;

    const ui = await ReadmePage({ params });
    render(ui);
    expect(sidebar.props.canManage).toBe(false);
  });
});
