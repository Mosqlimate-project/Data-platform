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

  it("renders the owner when the model exists", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ id: 1 }),
    }) as unknown as typeof fetch;

    const ui = await OwnerPage({ params: Promise.resolve({ owner: "alice" }) });
    render(ui);
    expect(screen.getByRole("heading")).toHaveTextContent("alice");

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://front.example/api/registry/model/alice/");
    expect(options.cache).toBe("no-store");
    expect(options.headers["x-internal-secret"]).toBe("shh");
  });

  it("calls notFound when the status is not 200", async () => {
    global.fetch = vi.fn().mockResolvedValue({ status: 404 }) as unknown as typeof fetch;
    await expect(OwnerPage({ params: Promise.resolve({ owner: "nobody" }) })).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });
});
