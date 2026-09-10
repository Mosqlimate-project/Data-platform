import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import RegisterPage from "./page";

const i18nMock = vi.hoisted(() => {
  const t = vi.fn((key: string) => key);
  return { t, i18n: { language: "en", changeLanguage: vi.fn(), on: vi.fn(), off: vi.fn() } };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18nMock.t, i18n: i18nMock.i18n }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("react-hot-toast", () => ({
  __esModule: true,
  default: toast,
}));

const zx = vi.hoisted(() => ({ result: { score: 4, feedback: { warning: "" } } }));
vi.mock("zxcvbn", () => ({ default: () => zx.result }));

vi.mock("lodash.debounce", () => ({
  __esModule: true,
  default: (fn: (...args: any[]) => any) => (...args: any[]) => fn(...args),
}));

const nav = vi.hoisted(() => ({ query: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.query),
}));

const locationMock = { href: "", assign: vi.fn(), replace: vi.fn() };

const strongPassword = "Str0ng!Pass#2024";

async function flush() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function inputs(container: HTMLElement) {
  const all = Array.from(container.querySelectorAll("input"));
  return {
    file: all[0] as HTMLInputElement,
    username: all[1] as HTMLInputElement,
    email: all[2] as HTMLInputElement,
    password: all[3] as HTMLInputElement,
    first: all[4] as HTMLInputElement,
    last: all[5] as HTMLInputElement,
    homepage: all[6] as HTMLInputElement,
    agree: all[7] as HTMLInputElement,
  };
}

describe("app/register/page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nav.query = "";
    zx.result = { score: 4, feedback: { warning: "" } };
    vi.stubGlobal("location", locationMock);
    locationMock.href = "";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }) as unknown as typeof fetch;
    window.URL.createObjectURL = vi.fn(() => "blob:x");
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the registration form", () => {
    const { container } = render(<RegisterPage />);
    expect(screen.getByText("register_page.title")).toBeInTheDocument();
    const { username, email, password } = inputs(container);
    expect(username).toBeInTheDocument();
    expect(email).toBeInTheDocument();
    expect(password).toBeInTheDocument();
  });

  it("validates the username length and format", async () => {
    const { container } = render(<RegisterPage />);
    const { username } = inputs(container);

    fireEvent.change(username, { target: { value: "ab" } });
    await flush();
    expect(screen.getByText("register_page.errors.username_short")).toBeInTheDocument();

    fireEvent.change(username, { target: { value: "a".repeat(26) } });
    await flush();
    expect(screen.getByText("register_page.errors.username_long")).toBeInTheDocument();

    fireEvent.change(username, { target: { value: "bad name!" } });
    await flush();
    expect(screen.getByText("register_page.errors.username_invalid")).toBeInTheDocument();
  });

  it("flags a taken username", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as unknown as typeof fetch;
    const { container } = render(<RegisterPage />);
    fireEvent.change(inputs(container).username, { target: { value: "taken" } });
    await flush();
    expect(screen.getByText("register_page.errors.username_taken")).toBeInTheDocument();
  });

  it("shows a password weakness error", () => {
    zx.result = { score: 1, feedback: { warning: "" } };
    const { container } = render(<RegisterPage />);
    fireEvent.change(inputs(container).password, { target: { value: "123" } });
    expect(screen.getByText("register_page.errors.password_weak")).toBeInTheDocument();
  });

  it("registers the user successfully", async () => {
    const { container } = render(<RegisterPage />);
    const { username, email, password, first, last, agree } = inputs(container);

    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(email, { target: { value: "u@b.c" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.click(agree);

    const submit = screen.getByRole("button", { name: "register_page.btn_create" });
    expect(submit).not.toBeDisabled();

    fireEvent.click(submit);
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[0] === "/api/user/register")).toBe(true)
    );
    expect(toast.success).toHaveBeenCalledWith("register_page.success");
    expect(locationMock.href).toBe("/");
  });

  it("does not submit without agreeing to terms", () => {
    const { container } = render(<RegisterPage />);
    const { username, password } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    expect(screen.getByRole("button", { name: "register_page.btn_create" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "register_page.btn_create" }));
    expect((global.fetch as any).mock.calls.some((c: any[]) => String(c[0]).includes("/api/user/register"))).toBe(false);
  });

  function mockRegisterResponse(register: () => Promise<unknown>) {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/check-username")) return Promise.resolve({ ok: true, json: async () => ({}) });
      return register();
    }) as unknown as typeof fetch;
  }

  it("handles a username already registered response", async () => {
    mockRegisterResponse(() =>
      Promise.resolve({ ok: false, json: async () => ({ message: "Username already registered" }) })
    );
    const { container } = render(<RegisterPage />);
    const { username, email, password, first, last, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(email, { target: { value: "u@b.c" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.click(agree);

    fireEvent.click(screen.getByRole("button", { name: "register_page.btn_create" }));
    await waitFor(() => expect(screen.getByText("register_page.errors.username_taken_api")).toBeInTheDocument());
  });

  it("handles an email already registered response", async () => {
    mockRegisterResponse(() =>
      Promise.resolve({ ok: false, json: async () => ({ message: "Email already registered" }) })
    );
    const { container } = render(<RegisterPage />);
    const { username, email, password, first, last, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(email, { target: { value: "u@b.c" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.click(agree);

    fireEvent.click(screen.getByRole("button", { name: "register_page.btn_create" }));
    await waitFor(() => expect(screen.getByText("register_page.errors.email_taken_api")).toBeInTheDocument());
  });

  it("toasts a generic registration error", async () => {
    mockRegisterResponse(() => Promise.resolve({ ok: false, json: async () => ({ message: "boom" }) }));
    const { container } = render(<RegisterPage />);
    const { username, email, password, first, last, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(email, { target: { value: "u@b.c" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.click(agree);

    fireEvent.click(screen.getByRole("button", { name: "register_page.btn_create" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("boom"));
  });

  it("toasts an error when the request throws", async () => {
    mockRegisterResponse(() => Promise.reject(new Error("boom")));
    const { container } = render(<RegisterPage />);
    const { username, email, password, first, last, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(email, { target: { value: "u@b.c" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.click(agree);

    fireEvent.click(screen.getByRole("button", { name: "register_page.btn_create" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("register_page.errors.generic_error"));
  });

  it("loads oauth data from the query param", async () => {
    nav.query = "data=enc";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ email: "oauth@b.c", username: "oauthuser", first_name: "O", last_name: "A" }),
    }) as unknown as typeof fetch;
    const { container } = render(<RegisterPage />);
    await waitFor(() => expect(inputs(container).email).toHaveValue("oauth@b.c"));
    expect(inputs(container).username).toHaveValue("oauthuser");
  });

  it("toasts when the oauth data cannot be decoded", async () => {
    nav.query = "data=enc";
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    render(<RegisterPage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("register_page.errors.auth_expired"));
  });

  it("locks the username and email when provided via query", () => {
    nav.query = "username=locked&email=l@b.c";
    const { container } = render(<RegisterPage />);
    expect(inputs(container).username).toBeDisabled();
    expect(inputs(container).email).toBeDisabled();
  });

  it("previews the selected avatar", () => {
    const { container } = render(<RegisterPage />);
    const file = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(inputs(container).file, { target: { files: [file] } });
    expect(screen.getByAltText("Avatar Preview")).toBeInTheDocument();
  });

  it("shows a fair strength label for a medium password", () => {
    zx.result = { score: 2, feedback: { warning: "" } };
    const { container } = render(<RegisterPage />);
    fireEvent.change(inputs(container).password, { target: { value: "medium" } });
    expect(screen.getByText("register_page.password_strength.fair")).toBeInTheDocument();
  });

  it("shows the password feedback when provided", () => {
    zx.result = { score: 3, feedback: { warning: "Add symbols" } };
    const { container } = render(<RegisterPage />);
    fireEvent.change(inputs(container).password, { target: { value: "medium" } });
    expect(screen.getByText("Add symbols")).toBeInTheDocument();
  });

  it("blocks submitting a weak password", async () => {
    zx.result = { score: 1, feedback: { warning: "" } };
    const { container } = render(<RegisterPage />);
    const { username, password, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(password, { target: { value: "weak" } });
    fireEvent.click(agree);
    fireEvent.submit(container.querySelector("form")!);
    await flush();
    expect(
      (global.fetch as any).mock.calls.some((c: any[]) => c[0] === "/api/user/register")
    ).toBe(false);
  });

  it("does not submit when terms are not accepted", async () => {
    const { container } = render(<RegisterPage />);
    const { username, password } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.submit(container.querySelector("form")!);
    await flush();
    expect(
      (global.fetch as any).mock.calls.some((c: any[]) => c[0] === "/api/user/register")
    ).toBe(false);
  });

  it("does not submit while a username error is present", async () => {
    const { container } = render(<RegisterPage />);
    const { username, password, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "ab" } });
    await flush();
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.click(agree);
    fireEvent.submit(container.querySelector("form")!);
    await flush();
    expect(
      (global.fetch as any).mock.calls.some((c: any[]) => c[0] === "/api/user/register")
    ).toBe(false);
  });

  it("flags a username check failure", async () => {
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/user/check-username")) return Promise.reject(new Error("down"));
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;
    const { container } = render(<RegisterPage />);
    fireEvent.change(inputs(container).username, { target: { value: "gooduser" } });
    await flush();
    expect(screen.getByText("register_page.errors.username_check_fail")).toBeInTheDocument();
  });

  it("submits oauth data and an avatar when present", async () => {
    nav.query = "data=enc";
    global.fetch = vi.fn((input: any) => {
      const url = String(input);
      if (url.includes("/api/auth/decode"))
        return Promise.resolve({ ok: true, json: async () => ({ email: "o@b.c", username: "oauthuser" }) });
      return Promise.resolve({ ok: true, json: async () => ({}) });
    }) as unknown as typeof fetch;
    const { container } = render(<RegisterPage />);
    await waitFor(() => expect(inputs(container).email).toHaveValue("o@b.c"));
    const { password, first, last, file, agree } = inputs(container);
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.change(file, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
    fireEvent.click(agree);
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[0] === "/api/user/register")).toBe(true)
    );
    const registerCall = (global.fetch as any).mock.calls.find((c: any[]) => c[0] === "/api/user/register");
    const body = registerCall[1].body as FormData;
    expect(body.get("oauth_data")).toBe("enc");
    expect(body.get("avatar_file")).toBeTruthy();
  });

  it("toasts the default create error when the response has no message", async () => {
    mockRegisterResponse(() => Promise.resolve({ ok: false, json: async () => ({}) }));
    const { container } = render(<RegisterPage />);
    const { username, email, password, first, last, agree } = inputs(container);
    fireEvent.change(username, { target: { value: "gooduser" } });
    await flush();
    fireEvent.change(email, { target: { value: "u@b.c" } });
    fireEvent.change(password, { target: { value: strongPassword } });
    fireEvent.change(first, { target: { value: "F" } });
    fireEvent.change(last, { target: { value: "L" } });
    fireEvent.click(agree);
    fireEvent.click(screen.getByRole("button", { name: "register_page.btn_create" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("register_page.errors.create_fail"));
  });

  it("clears the avatar when the file selection is emptied", () => {
    const { container } = render(<RegisterPage />);
    const { file } = inputs(container);
    fireEvent.change(file, { target: { files: [new File(["x"], "a.png", { type: "image/png" })] } });
    expect(screen.getByAltText("Avatar Preview")).toBeInTheDocument();
    fireEvent.change(file, { target: { files: [] } });
    expect(screen.queryByAltText("Avatar Preview")).not.toBeInTheDocument();
  });

  it("loads the avatar url from oauth data", async () => {
    nav.query = "data=enc";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ username: "oauthuser", avatar_url: "https://oauth/avatar" }),
    }) as unknown as typeof fetch;
    const { container } = render(<RegisterPage />);
    await waitFor(() => expect(inputs(container).username).toHaveValue("oauthuser"));
    expect(
      (container.querySelector('img[alt="Avatar Preview"]') as HTMLImageElement).getAttribute("src")
    ).toBe("https://oauth/avatar");
  });

  it("ignores username changes when locked", () => {
    nav.query = "username=locked&email=l@b.c";
    const { container } = render(<RegisterPage />);
    fireEvent.change(inputs(container).username, { target: { value: "changed" } });
    expect(inputs(container).username).toHaveValue("locked");
  });

  it("updates the homepage field", () => {
    const { container } = render(<RegisterPage />);
    const { homepage } = inputs(container);
    fireEvent.change(homepage, { target: { value: "https://me.example" } });
    expect(homepage).toHaveValue("https://me.example");
  });
});
