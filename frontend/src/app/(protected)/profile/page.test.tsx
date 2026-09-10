import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProfilePage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const auth = vi.hoisted(() => ({ user: null as any }));
vi.mock("@/components/AuthProvider", () => ({
  useAuth: () => ({ user: auth.user }),
}));

const profile = {
  username: "alice",
  email: "a@b.c",
  first_name: "Alice",
  last_name: "Smith",
  homepage: "https://a.com",
  avatar_url: "https://avatar",
};

function fileOf(size: number, name = "a.png") {
  const file = new File(["x"], name, { type: "image/png" });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("app/(protected)/profile/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the fetched profile", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => profile }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("alice")).toBeInTheDocument());
    expect(screen.getByText("a@b.c")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice")).toBeInTheDocument();
  });

  it("falls back to the auth user when the profile request fails", async () => {
    auth.user = { username: "bob", email: "b@b.c", first_name: "Bob", last_name: "B" };
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    expect(screen.getByText("b@b.c")).toBeInTheDocument();
  });

  it("logs an error when the profile request throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(err).toHaveBeenCalled());
  });

  it("updates the profile successfully", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("Alice"), { target: { value: "Alicia" } });
    fireEvent.click(screen.getByRole("button", { name: "profile.update_btn" }));
    await waitFor(() => expect((global.fetch as any).mock.calls[1][1].method).toBe("POST"));
  });

  it("alerts when updating the profile fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "bad" }) }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "profile.update_btn" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("bad"));
  });

  it("alerts when updating the profile throws", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockRejectedValueOnce(new Error("boom")) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "profile.update_btn" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("profile.alerts.update_error"));
  });

  it("rejects oversized avatars", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => profile }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(6 * 1024 * 1024)] } });
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("profile.alerts.size_limit"));
  });

  it("uploads an avatar successfully", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ avatar_url: "https://new" }) }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(100)] } });
    await waitFor(() => expect((screen.getByAltText("alice") as HTMLImageElement).getAttribute("src")).toBe("https://new"));
  });

  it("alerts when the avatar upload fails", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "no" }) }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(100)] } });
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("no"));
  });

  it("alerts when the avatar upload throws", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockRejectedValueOnce(new Error("boom")) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(100)] } });
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("profile.alerts.upload_error"));
  });

  it("opens the file picker when the avatar is clicked", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => profile }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const clickSpy = vi.spyOn(input, "click").mockImplementation(() => {});
    const avatar = container.querySelector(".h-40.w-40") as HTMLElement;
    fireEvent.click(avatar);
    expect(clickSpy).toHaveBeenCalled();
  });

  it("ignores empty file selections", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => profile }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [] } });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("tolerates profiles with empty name fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: "alice", email: "a@b.c", first_name: "", last_name: "", homepage: "" }),
    }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("alice")).toBeInTheDocument());
  });

  it("falls back to empty names from the auth user", async () => {
    auth.user = { username: "bob", email: "b@b.c" };
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
  });

  it("updates using the auth user when no profile was loaded", async () => {
    auth.user = { username: "bob", email: "b@b.c", first_name: "Bob", last_name: "B" };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "profile.update_btn" }));
    await waitFor(() => expect((global.fetch as any).mock.calls[1][1].method).toBe("POST"));
  });

  it("alerts the default update error when no message is returned", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "profile.update_btn" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("profile.alerts.update_fail"));
  });

  it("alerts the default upload error when no message is returned", async () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => profile })
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Alice")).toBeInTheDocument());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(100)] } });
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("profile.alerts.upload_fail"));
  });

  it("uploads an avatar without a loaded profile", async () => {
    auth.user = { username: "bob", email: "b@b.c" };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ avatar_url: "https://new" }) }) as unknown as typeof fetch;
    const { container } = render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(100)] } });
    await waitFor(() => expect((global.fetch as any).mock.calls[1][1].method).toBe("POST"));
  });

  it("updates the last name and homepage fields", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => profile }) as unknown as typeof fetch;
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByDisplayValue("Smith")).toBeInTheDocument());
    fireEvent.change(screen.getByDisplayValue("Smith"), { target: { value: "Smythe" } });
    fireEvent.change(screen.getByDisplayValue("https://a.com"), { target: { value: "https://b.com" } });
    expect(screen.getByDisplayValue("Smythe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://b.com")).toBeInTheDocument();
  });
});
