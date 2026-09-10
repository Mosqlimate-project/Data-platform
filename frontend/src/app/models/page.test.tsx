import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "./page";

const env = vi.hoisted(() => ({ url: "https://front.example", secret: "shh" }));
vi.mock("@/lib/env", () => ({
  get NEXT_PUBLIC_FRONTEND_URL() {
    return env.url;
  },
  get FRONTEND_SECRET() {
    return env.secret;
  },
}));

const cookieGet = vi.hoisted(() => vi.fn());
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGet })),
}));

const modelsMock = vi.hoisted(() => ({ props: null as any }));
vi.mock("./Models", () => ({
  default: (props: any) => {
    modelsMock.props = props;
    return <div data-testid="models">{props.models.length}</div>;
  },
}));

const models = [{ model_id: 1 }];
const tags = [{ id: "t1" }];

describe("app/models/page", () => {
  beforeEach(() => {
    env.url = "https://front.example";
    env.secret = "shh";
    cookieGet.mockReturnValue(undefined);
    modelsMock.props = null;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(models),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches models and tags and renders them", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: true, json: async () => tags });

    const ui = await Page();
    render(ui);
    expect(screen.getByTestId("models")).toHaveTextContent("1");
    expect(modelsMock.props.tags).toEqual(tags);

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://front.example/api/registry/models/thumbnails/");
    expect(options.cache).toBe("no-store");
    expect(options.headers["x-internal-secret"]).toBe("shh");
  });

  it("forwards the access token when present", async () => {
    cookieGet.mockReturnValue({ value: "tok" });
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: true, json: async () => models })
      .mockResolvedValueOnce({ ok: true, json: async () => tags });

    await Page();
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers.cookie).toBe("access_token=tok");
  });

  it("throws when a request fails", async () => {
    (global.fetch as any)
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, json: async () => tags });
    await expect(Page()).rejects.toThrow("Failed to fetch data");
  });
});
