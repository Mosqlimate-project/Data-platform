import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddModelPage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

vi.mock("framer-motion", () => {
  const MotionDiv = ({ children, ...rest }: any) => <div {...rest}>{children}</div>;
  return {
    motion: new Proxy({}, { get: () => MotionDiv }),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock("@/components/NetworkBackground", () => ({ default: () => null }));

const oauthLogin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/auth", () => ({ oauthLogin }));

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/model/add",
}));

const repos = [
  { id: "1", name: "repo1", url: "https://github.com/alice/repo1", private: false, provider: "github", available: true },
  { id: "2", name: "repo2", url: "https://github.com/alice/repo2", private: false, provider: "github", available: false },
];

function mockFetch(overrides: { connections?: string[]; github?: any[]; gitlab?: any[]; sprints?: any[]; addOk?: boolean; addMessage?: string } = {}) {
  global.fetch = vi.fn((input: any) => {
    const url = String(input);
    if (url.includes("/api/user/oauth/connections"))
      return Promise.resolve({ ok: true, json: async () => overrides.connections ?? ["github", "gitlab"] });
    if (url.includes("/api/registry/model/add/sprint/actives"))
      return Promise.resolve({ ok: true, json: async () => overrides.sprints ?? [{ id: 1, year: 2024, start_date: "a", end_date: "b" }] });
    if (url.includes("/api/user/oauth/repositories/github"))
      return Promise.resolve({ ok: true, json: async () => overrides.github ?? repos });
    if (url.includes("/api/user/oauth/repositories/gitlab"))
      return Promise.resolve({ ok: true, json: async () => overrides.gitlab ?? [] });
    if (url.includes("/api/registry/model/add")) {
      if (overrides.addOk === false)
        return Promise.resolve({ ok: false, json: async () => ({ message: overrides.addMessage ?? "nope" }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  }) as unknown as typeof fetch;
}

async function renderPage() {
  render(<AddModelPage />);
  await waitFor(() => expect(screen.getByText("repo1")).toBeInTheDocument());
}

async function goToVerify() {
  await renderPage();
  fireEvent.click(screen.getByText("repo1"));
  const selects = screen.getAllByRole("combobox");
  fireEvent.change(selects[0], { target: { value: "week" } });
  fireEvent.change(selects[1], { target: { value: "quantitative" } });
  fireEvent.click(screen.getByRole("button", { name: "add_model.config.continue" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "add_model.verify.confirm" })).toBeInTheDocument());
}

describe("app/(protected)/model/add/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads repositories and renders the selection step", async () => {
    await renderPage();
    expect(screen.getByText("add_model.title")).toBeInTheDocument();
    expect(screen.getByText("repo2")).toBeInTheDocument();
  });

  it("rejects an invalid manual url", async () => {
    await renderPage();
    const input = screen.getByPlaceholderText("add_model.selection.placeholder_url");
    fireEvent.change(input, { target: { value: "https://github.com/x/y" } });
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.next" }));
    expect(screen.getByText("add_model.selection.errors.invalid_repo")).toBeInTheDocument();
  });

  it("rejects an already imported repository", async () => {
    await renderPage();
    const input = screen.getByPlaceholderText("add_model.selection.placeholder_url");
    fireEvent.change(input, { target: { value: "https://github.com/alice/repo2" } });
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.next" }));
    expect(screen.getByText("add_model.selection.errors.already_imported")).toBeInTheDocument();
  });

  it("accepts a valid manual url", async () => {
    await renderPage();
    const input = screen.getByPlaceholderText("add_model.selection.placeholder_url");
    fireEvent.change(input, { target: { value: "https://github.com/alice/repo1" } });
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.next" }));
    expect(screen.getByText("add_model.config.description")).toBeInTheDocument();
  });

  it("does not select an unavailable repository", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("repo2"));
    expect(screen.queryByText("add_model.config.description")).not.toBeInTheDocument();
  });

  it("filters repositories by search and tab", async () => {
    await renderPage();
    fireEvent.change(screen.getByPlaceholderText("add_model.selection.search_placeholder"), { target: { value: "zzz" } });
    expect(screen.queryByText("repo1")).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("add_model.selection.search_placeholder"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.tabs.gitlab" }));
    expect(screen.queryByText("repo1")).not.toBeInTheDocument();
  });

  it("goes back from config to selection", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("repo1"));
    fireEvent.click(screen.getByRole("button", { name: "add_model.config.back" }));
    expect(screen.getByText("add_model.title")).toBeInTheDocument();
  });

  it("imports the model successfully", async () => {
    await goToVerify();
    fireEvent.click(screen.getByRole("button", { name: "add_model.verify.confirm" }));
    await waitFor(() => expect(nav.push).toHaveBeenCalledWith("/alice/repo1/predictions"));
  });

  it("keeps the user on the page when the import fails", async () => {
    mockFetch({ addOk: false });
    await goToVerify();
    fireEvent.click(screen.getByRole("button", { name: "add_model.verify.confirm" }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(nav.push).not.toHaveBeenCalled();
  });

  it("goes back from verify to config", async () => {
    await goToVerify();
    fireEvent.click(screen.getAllByRole("button", { name: /add_model.config.back/ })[0]);
    expect(screen.getByText("add_model.config.description")).toBeInTheDocument();
  });

  it("shows the sprint selector when sprints are active", async () => {
    await renderPage();
    fireEvent.click(screen.getByText("repo1"));
    expect(screen.getByText("add_model.config.sprint_label")).toBeInTheDocument();
  });

  it("prompts to connect github when not connected", async () => {
    mockFetch({ connections: [], github: [] });
    render(<AddModelPage />);
    await waitFor(() => expect(screen.getByText("add_model.selection.tabs.github")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.tabs.github" }));
    await waitFor(() => expect(screen.getByText("add_model.selection.connect.github_title")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /add_model.selection.connect.github_btn/ }));
    expect(oauthLogin).toHaveBeenCalledWith("github", "/model/add");
  });

  it("shows the github app install link when connected but missing", async () => {
    mockFetch({ connections: ["github"], github: [] });
    render(<AddModelPage />);
    await waitFor(() => expect(screen.getByText("add_model.selection.tabs.github")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.tabs.github" }));
    await waitFor(() => expect(screen.getByText("add_model.selection.connect.github_app_title")).toBeInTheDocument());
  });

  it("prompts to connect gitlab when not connected", async () => {
    mockFetch({ connections: [], gitlab: [] });
    render(<AddModelPage />);
    await waitFor(() => expect(screen.getByText("add_model.selection.tabs.gitlab")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "add_model.selection.tabs.gitlab" }));
    await waitFor(() => expect(screen.getByText("add_model.selection.connect.gitlab_title")).toBeInTheDocument());
  });

  it("shows the generic empty state", async () => {
    mockFetch({ connections: ["github", "gitlab"], github: [], gitlab: [] });
    render(<AddModelPage />);
    await waitFor(() => expect(screen.getByText("add_model.selection.empty.title")).toBeInTheDocument());
  });
});
