import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ModelLayout from "./layout";

vi.mock("@/lib/env", () => ({
  get BACKEND_BASE_URL() {
    return "http://backend:8042";
  },
}));

const cookieGet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const notFound = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  notFound,
}));

vi.mock("@/components/model/tabs", () => ({
  ModelTabs: () => <div data-testid="tabs" />,
}));

const params = Promise.resolve({ owner: "alice", repository: "repo" });
const modelDetails = { avatar_url: null, description: "d" };

describe("app/[owner]/[repository]/layout", () => {
  beforeEach(() => {
    cookieGet.mockReturnValue(undefined);
    notFound.mockReset();
    notFound.mockImplementation(() => {
      throw new Error("NEXT_NOT_FOUND");
    });
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => modelDetails,
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children, heading and tabs", async () => {
    const ui = await ModelLayout({ children: <span>child</span>, params });
    render(ui);
    expect(screen.getByText("child")).toBeInTheDocument();
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/repo/)).toBeInTheDocument();
    expect(screen.getByTestId("tabs")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();

    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("http://backend:8042/api/registry/model/alice/repo/");
  });

  it("renders the avatar image when present", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ avatar_url: "https://avatar" }),
    }) as unknown as typeof fetch;

    const ui = await ModelLayout({ children: <span>child</span>, params });
    render(ui);
    const img = screen.getByAltText("alice") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("https://avatar");
  });

  it("adds an authorization header when a token exists", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    await ModelLayout({ children: <span>child</span>, params });
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer tok");
  });

  it("calls notFound when the status is not 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 404 }) as unknown as typeof fetch;
    await expect(ModelLayout({ children: <span>child</span>, params })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
