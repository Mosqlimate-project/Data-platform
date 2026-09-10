import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthSettingsPage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const oauthLogin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/auth", () => ({ oauthLogin }));

vi.mock("next/navigation", () => ({
  usePathname: () => "/profile/auth",
}));

function mockFetch(overrides: { key?: string | null; keyOk?: boolean; github?: any[]; githubOk?: boolean; connections?: string[] } = {}) {
  global.fetch = vi.fn((input: any) => {
    const url = String(input);
    if (url.includes("/api/user/api-key/refresh"))
      return Promise.resolve({ ok: true, json: async () => ({ api_key: "new-key" }) });
    if (url.includes("/api/user/api-key"))
      return Promise.resolve({ ok: overrides.keyOk ?? true, json: async () => ({ api_key: overrides.key ?? "k:v" }) });
    if (url.includes("/api/user/oauth/repositories/github"))
      return Promise.resolve({ ok: overrides.githubOk ?? true, json: async () => overrides.github ?? [{ id: 1 }] });
    if (url.includes("/api/user/oauth/connections"))
      return Promise.resolve({ ok: true, json: async () => overrides.connections ?? [] });
    return Promise.resolve({ ok: true, json: async () => [] });
  }) as unknown as typeof fetch;
}

describe("app/(protected)/profile/auth/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders the api key masked and reveals it on demand", async () => {
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getByText("profile_auth.api_key_title")).toBeInTheDocument());
    expect(screen.queryByText("k:v")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle("Show"));
    expect(screen.getByText("k:v")).toBeInTheDocument();
  });

  it("copies the api key to the clipboard", async () => {
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getByTitle("Copy to clipboard")).toBeInTheDocument());

    fireEvent.click(screen.getByTitle("Copy to clipboard"));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("k:v");
    await waitFor(() => expect(screen.getByText("profile_auth.alerts.copied")).toBeInTheDocument());

    await waitFor(() => expect(screen.queryByText("profile_auth.alerts.copied")).not.toBeInTheDocument(), {
      timeout: 2000,
    });
  });

  it("regenerates the api key", async () => {
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getByText("profile_auth.regenerate")).toBeInTheDocument());

    fireEvent.click(screen.getByText("profile_auth.regenerate"));
    expect(screen.getByText("profile_auth.regenerate_key")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "profile_auth.confirm_regenerate" }));
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[0] === "/api/user/api-key/refresh")).toBe(true)
    );
  });

  it("cancels the regenerate modal", async () => {
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getByText("profile_auth.regenerate")).toBeInTheDocument());
    fireEvent.click(screen.getByText("profile_auth.regenerate"));
    fireEvent.click(screen.getByRole("button", { name: "common.cancel" }));
    expect(screen.queryByText("profile_auth.regenerate_key")).not.toBeInTheDocument();
  });

  it("renders connected providers and connect buttons", async () => {
    mockFetch({ connections: ["github"] });
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getAllByText("profile_auth.connected")).toHaveLength(1));

    fireEvent.click(screen.getAllByRole("button", { name: "profile_auth.connect" })[0]);
    expect(oauthLogin).toHaveBeenCalledWith("google", "/profile/auth");
  });

  it("shows the installed github app state", async () => {
    mockFetch({ connections: ["github"], github: [{ id: 1 }] });
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getByText("profile_auth.installed")).toBeInTheDocument());
  });

  it("shows the install app link when connected but no repos", async () => {
    mockFetch({ connections: ["github"], github: [] });
    render(<AuthSettingsPage />);
    await waitFor(() =>
      expect(screen.getByRole("link", { name: /profile_auth.install_app/ })).toBeInTheDocument()
    );
  });

  it("disables the install button when github is not connected", async () => {
    mockFetch({ connections: [], github: [] });
    render(<AuthSettingsPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /profile_auth.install_app/ })).toBeDisabled()
    );
  });

  it("logs errors when the api key fetch fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetch({ keyOk: false });
    render(<AuthSettingsPage />);
    await waitFor(() => expect(err).toHaveBeenCalledWith("Failed to fetch user api-key"));
  });

  it("marks the github app missing when the check fails", async () => {
    mockFetch({ githubOk: false, connections: [] });
    render(<AuthSettingsPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /profile_auth.install_app/ })).toBeDisabled()
    );
  });

  it("marks the github app missing when the check throws", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/oauth/repositories/github")) return Promise.reject(new Error("boom"));
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;
    render(<AuthSettingsPage />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /profile_auth.install_app/ })).toBeDisabled()
    );
  });

  it("logs errors when the api key request throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key")) return Promise.reject(new Error("boom"));
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;
    render(<AuthSettingsPage />);
    await waitFor(() => expect(err).toHaveBeenCalledWith("Failed to fetch API key"));
  });

  it("logs errors when the connections request fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/oauth/connections")) return Promise.resolve({ ok: false });
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;
    render(<AuthSettingsPage />);
    await waitFor(() => expect(err).toHaveBeenCalledWith("Failed to fetch connections"));
  });

  it("logs a network error when the connections request throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/oauth/connections")) return Promise.reject(new Error("net"));
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;
    render(<AuthSettingsPage />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs errors when the api key refresh throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/api-key/refresh")) return Promise.reject(new Error("boom"));
      return Promise.resolve({ ok: true, json: async () => [] });
    }) as unknown as typeof fetch;
    render(<AuthSettingsPage />);
    await waitFor(() => expect(screen.getByText("profile_auth.regenerate")).toBeInTheDocument());
    fireEvent.click(screen.getByText("profile_auth.regenerate"));
    fireEvent.click(screen.getByRole("button", { name: "profile_auth.confirm_regenerate" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });
});
