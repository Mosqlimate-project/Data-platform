import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PredictionsPage from "./page";

const env = vi.hoisted(() => ({ url: "https://front.example", secret: "shh" }));
vi.mock("@/lib/env", () => ({
  get NEXT_PUBLIC_FRONTEND_URL() {
    return env.url;
  },
  get FRONTEND_SECRET() {
    return env.secret;
  },
}));

const getPermissions = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api/model", () => ({ getPermissions }));

const list = vi.hoisted(() => ({ props: null as any }));
vi.mock("@/components/model/Predictions", () => ({
  default: (props: any) => {
    list.props = props;
    return <div data-testid="list">{props.predictions.length}</div>;
  },
}));

const params = Promise.resolve({ owner: "alice", repository: "repo" });
const predictions = [{ id: 1 }, { id: 2 }];

describe("app/[owner]/[repository]/predictions/page", () => {
  beforeEach(() => {
    getPermissions.mockResolvedValue({ can_manage: true });
    list.props = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the predictions and count", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => predictions }) as unknown as typeof fetch;
    const ui = await PredictionsPage({ params });
    render(ui);
    expect(screen.getByTestId("list")).toHaveTextContent("2");
    expect(screen.getByText("2 predictions")).toBeInTheDocument();
    expect(list.props.canManage).toBe(true);
    expect(list.props.owner).toBe("alice");

    const [url, options] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://front.example/api/registry/model/alice/repo/predictions");
    expect(options.headers["x-internal-secret"]).toBe("shh");
  });

  it("renders without a count when there are no predictions", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    const ui = await PredictionsPage({ params });
    render(ui);
    expect(screen.queryByText("0 predictions")).not.toBeInTheDocument();
    expect(screen.queryByText("2 predictions")).not.toBeInTheDocument();
  });

  it("returns an empty list when the request fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    const ui = await PredictionsPage({ params });
    render(ui);
    expect(screen.getByTestId("list")).toHaveTextContent("0");
  });

  it("returns an empty list and logs when the fetch throws", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const ui = await PredictionsPage({ params });
    render(ui);
    expect(screen.getByTestId("list")).toHaveTextContent("0");
    expect(err).toHaveBeenCalled();
  });

  it("uses the singular label for a single prediction", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: 1 }] }) as unknown as typeof fetch;
    const ui = await PredictionsPage({ params });
    render(ui);
    expect(screen.getByText("1 prediction")).toBeInTheDocument();
  });

  it("omits the internal secret header when not configured", async () => {
    env.secret = "";
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] }) as unknown as typeof fetch;
    await PredictionsPage({ params });
    const [, options] = (global.fetch as any).mock.calls[0];
    expect(options.headers["x-internal-secret"]).toBe("");
  });
});
