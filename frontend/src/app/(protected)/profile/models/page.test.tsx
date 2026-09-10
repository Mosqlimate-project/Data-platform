import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ModelsPage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const env = vi.hoisted(() => ({ secret: "shh" }));
vi.mock("@/lib/env", () => ({
  get FRONTEND_SECRET() {
    return env.secret;
  },
}));

const models = [
  { id: 1, name: "repo1", owner: "alice", provider: "github", category: "quantitative", can_manage: true, active: true },
  { id: 2, name: "repo2", owner: "bob", provider: "gitlab", category: "categorical", can_manage: false, active: false },
  { id: 3, name: "repo3", owner: "carol", provider: "other", category: "x", can_manage: true, active: false },
];

describe("app/(protected)/profile/models/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    env.secret = "shh";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a spinner while loading", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})) as unknown as typeof fetch;
    const { container } = render(<ModelsPage />);
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("shows the empty state", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("profile_models.empty_title")).toBeInTheDocument());
  });

  it("renders the models table", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => models }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("repo1")).toBeInTheDocument());
    expect(screen.getByText("repo2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "repo1" })).toHaveAttribute("href", "/alice/repo1/");
    expect(screen.getByText("profile_models.status.active")).toBeInTheDocument();
    expect(screen.getAllByText("profile_models.status.inactive")).toHaveLength(2);
    expect(screen.getAllByText("-")).toHaveLength(1);
  });

  it("toggles the active status", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ active: false }) }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "profile_models.status.active" })).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "profile_models.status.active" }));
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === "PATCH")).toBe(true)
    );
  });

  it("logs an error when toggling fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "bad" }) }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "profile_models.status.active" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "profile_models.status.active" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("deletes a model after confirming its name", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("repo1")).toBeInTheDocument());

    const rowButtons = screen.getByText("repo1").closest("tr")?.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    fireEvent.click(rowButtons[1]);
    await waitFor(() => expect(screen.getByText("profile_models.modal.title")).toBeInTheDocument());

    const confirmButton = screen.getByRole("button", { name: "profile_models.modal.confirm" });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("profile_models.modal.placeholder"), { target: { value: "repo1" } });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === "DELETE")).toBe(true)
    );
    expect(screen.queryByText("repo1")).not.toBeInTheDocument();
  });

  it("cancels the delete modal", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => models }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("repo1")).toBeInTheDocument());

    const rowButtons = screen.getByText("repo1").closest("tr")?.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    fireEvent.click(rowButtons[1]);
    await waitFor(() => expect(screen.getByText("profile_models.modal.title")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "profile_models.modal.cancel" }));
    expect(screen.queryByText("profile_models.modal.title")).not.toBeInTheDocument();
  });

  it("omits the internal secret when not configured", async () => {
    env.secret = "";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("profile_models.empty_title")).toBeInTheDocument());
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers["x-internal-secret"]).toBe("");
  });

  it("logs an error when the models request throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs the message when toggling fails without an error field", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "bad" }) }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "profile_models.status.active" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "profile_models.status.active" }));
    await waitFor(() => expect(err).toHaveBeenCalledWith("Failed to update status:", "bad"));
  });

  it("logs an error when toggling throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockRejectedValueOnce(new Error("boom")) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: "profile_models.status.active" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "profile_models.status.active" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs the message when deleting fails without an error field", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "nope" }) }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("repo1")).toBeInTheDocument());
    const rowButtons = screen.getByText("repo1").closest("tr")?.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    fireEvent.click(rowButtons[1]);
    await waitFor(() => expect(screen.getByText("profile_models.modal.title")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("profile_models.modal.placeholder"), { target: { value: "repo1" } });
    fireEvent.click(screen.getByRole("button", { name: "profile_models.modal.confirm" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("logs an error when deleting throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockRejectedValueOnce(new Error("boom")) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("repo1")).toBeInTheDocument());
    const rowButtons = screen.getByText("repo1").closest("tr")?.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    fireEvent.click(rowButtons[1]);
    await waitFor(() => expect(screen.getByText("profile_models.modal.title")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("profile_models.modal.placeholder"), { target: { value: "repo1" } });
    fireEvent.click(screen.getByRole("button", { name: "profile_models.modal.confirm" }));
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("renders an active read-only status", async () => {
    const extra = [
      ...models,
      { id: 4, name: "repo4", owner: "dave", provider: "github", category: "x", can_manage: false, active: true },
    ];
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => extra }) as unknown as typeof fetch;
    render(<ModelsPage />);
    await waitFor(() => expect(screen.getByText("repo4")).toBeInTheDocument());
    expect(screen.getAllByText("profile_models.status.active").length).toBe(2);
  });
});
