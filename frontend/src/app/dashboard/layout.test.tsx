import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardLayout from "./layout";

const env = vi.hoisted(() => ({ url: "https://front.example", secret: "shh" }));
const headers = vi.hoisted(() => ({ get: vi.fn() }));
const sidebar = vi.hoisted(() => ({ sections: null as unknown }));

vi.mock("@/lib/env", () => ({
  get NEXT_PUBLIC_FRONTEND_URL() {
    return env.url;
  },
  get FRONTEND_SECRET() {
    return env.secret;
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: headers.get })),
}));

vi.mock("@/components/dashboard/Sidebar", () => ({
  DashboardSidebar: (props: { sections: unknown }) => {
    sidebar.sections = props.sections;
    return <div data-testid="sidebar" />;
  },
}));

vi.mock("@/context/Dashboard", () => ({
  DashboardProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const sections = [
  { id: "default", label: "Default", categories: [] },
];

describe("app/dashboard/layout", () => {
  beforeEach(() => {
    env.url = "https://front.example";
    env.secret = "shh";
    headers.get.mockReturnValue(undefined);
    sidebar.sections = null;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(sections),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches sections and renders the sidebar and children", async () => {
    headers.get.mockReturnValue({ value: "tok123" });
    const ui = await DashboardLayout({ children: <span>child content</span> });
    render(ui);

    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByText("child content")).toBeInTheDocument();
    expect(sidebar.sections).toEqual(sections);

    const [url, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe("https://front.example/api/vis/dashboard/categories/");
    expect(options.headers["x-internal-secret"]).toBe("shh");
    expect(options.headers.cookie).toBe("access_token=tok123");
    expect(options.cache).toBe("no-store");
  });

  it("omits the cookie header when no token is present", async () => {
    const ui = await DashboardLayout({ children: <span>child</span> });
    render(ui);

    const [, options] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(options.headers.cookie).toBeUndefined();
  });

  it("returns an empty list when the frontend URL is missing", async () => {
    env.url = "";
    const ui = await DashboardLayout({ children: <span>child</span> });
    render(ui);
    expect(sidebar.sections).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns an empty list when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const ui = await DashboardLayout({ children: <span>child</span> });
    render(ui);
    expect(sidebar.sections).toEqual([]);
  });

  it("catches and logs fetch errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const ui = await DashboardLayout({ children: <span>child</span> });
    render(ui);
    expect(sidebar.sections).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
  });
});
