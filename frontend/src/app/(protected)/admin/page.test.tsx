import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminDashboard from "./page";

vi.mock("echarts-for-react", () => ({ default: () => <div data-testid="echarts" /> }));

const locationMock = {
  href: "",
  protocol: "http:",
  pathname: "/",
  reload: vi.fn(),
  assign: vi.fn(),
  replace: vi.fn(),
};

const users = [
  { id: 1, username: "alice", email: "a@b.c", name: "Alice", is_active: true, is_staff: true, rate_limit: "10/s", uuid: "u1", homepage: null },
  { id: 2, username: "bob", email: "", name: null, is_active: true, is_staff: false, rate_limit: "5/m", uuid: "u2", homepage: null },
];

const history = [
  { username: "bob", method: "GET", endpoint: "/api/datastore/", count: 3, latest_timestamp: "2024-01-01T00:00:00Z" },
  { username: "alice", method: "POST", endpoint: "/api/registry/", count: 1, latest_timestamp: "2024-01-01T00:00:00Z" },
  { username: "carol", method: "PUT", endpoint: "/api/x/", count: 1, latest_timestamp: "2024-01-01T00:00:00Z" },
];

function mockFetch(overrides: { me?: any; usage?: any } = {}) {
  global.fetch = vi.fn((input: any, options?: any) => {
    const url = String(input);
    if (url.includes("/api/me")) return Promise.resolve({ ok: true, json: async () => overrides.me ?? { is_staff: true } });
    if (url.includes("/api/log/users/") && options?.method === "PATCH")
      return Promise.resolve({ ok: true, json: async () => ({ is_active: false, rate_limit: "20/d" }) });
    if (url.includes("/api/log/users")) return Promise.resolve({ ok: true, json: async () => users });
    if (url.includes("/api/log/usage")) {
      if (overrides.usage !== undefined) return Promise.resolve({ ok: true, json: async () => overrides.usage });
      const group = new URL("http://x" + url).searchParams.get("group_by");
      if (group === "user") return Promise.resolve({ ok: true, json: async () => [{ username: "bob", count: 4 }] });
      if (group === "day") return Promise.resolve({ ok: true, json: async () => [{ day: "2024-01-01", count: 4 }] });
      if (group === "endpoint") return Promise.resolve({ ok: true, json: async () => ({ "/api/a/": 4 }) });
      return Promise.resolve({ ok: true, json: async () => ({ total_requests: 100, unique_users_count: 5, unique_endpoints_count: 3, application_scope_count: 1 }) });
    }
    if (url.includes("/api/log/history")) return Promise.resolve({ ok: true, json: async () => history });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as unknown as typeof fetch;
}

describe("app/(protected)/admin/page", () => {
  beforeEach(() => {
    vi.stubGlobal("location", locationMock);
    locationMock.href = "";
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("redirects when /api/me is not ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;
    render(<AdminDashboard />);
    await waitFor(() => expect(locationMock.href).toBe("/"));
  });

  it("redirects when the user is not staff", async () => {
    mockFetch({ me: { is_staff: false, is_superuser: false } });
    render(<AdminDashboard />);
    await waitFor(() => expect(locationMock.href).toBe("/"));
  });

  it("redirects when the verification request throws", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    render(<AdminDashboard />);
    await waitFor(() => expect(locationMock.href).toBe("/"));
  });

  it("renders the users table once authorized", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Admin Control Panel")).toBeInTheDocument());
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("No email linked")).toBeInTheDocument();
  });

  it("filters users and shows an empty state", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());

    fireEvent.change(screen.getByPlaceholderText(/Search by username/), { target: { value: "zzz" } });
    expect(screen.getByText("No users found matching your criteria.")).toBeInTheDocument();
  });

  it("blocks a user through the modal", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("button", { name: "Block User" })[1]);
    expect(screen.getByText("Block User Account?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Change" }));
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === "PATCH")).toBe(true)
    );
  });

  it("cancels the block modal", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());
    fireEvent.click(screen.getAllByRole("button", { name: "Block User" })[1]);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByText("Block User Account?")).not.toBeInTheDocument();
  });

  it("updates a rate limit through the modal", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("bob")).toBeInTheDocument());

    const editButton = screen.getByText("5/m").parentElement?.querySelector("button") as HTMLButtonElement;
    fireEvent.click(editButton);
    await waitFor(() => expect(screen.getByText("Modify Rate Limit")).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue("5"), { target: { value: "20" } });
    fireEvent.change(screen.getByDisplayValue("Minute"), { target: { value: "d" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply Constraints" }));
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => c[1]?.method === "PATCH")).toBe(true)
    );
  });

  it("renders analytics overview and live logs", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Admin Control Panel")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "API Analytics" }));
    await waitFor(() => expect(screen.getByText("100")).toBeInTheDocument());
    expect(screen.getByText("Active Endpoints")).toBeInTheDocument();
    expect(screen.getByText("Request Traffic Timeline")).toBeInTheDocument();
    expect(screen.getByText("/api/datastore/")).toBeInTheDocument();
  });

  it("renders analytics group-by user, day and endpoint tables", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Admin Control Panel")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "API Analytics" }));
    await waitFor(() => expect(screen.getByText("100")).toBeInTheDocument());

    const groupSelect = screen.getAllByRole("combobox")[0];

    fireEvent.change(groupSelect, { target: { value: "user" } });
    await waitFor(() => expect(screen.getByText("Request Volume")).toBeInTheDocument());

    fireEvent.change(groupSelect, { target: { value: "day" } });
    await waitFor(() => expect(screen.getByText("Total Hits")).toBeInTheDocument());

    fireEvent.change(groupSelect, { target: { value: "endpoint" } });
    await waitFor(() => expect(screen.getByText("Access Count")).toBeInTheDocument());
  });

  it("changes the live log limit", async () => {
    mockFetch();
    render(<AdminDashboard />);
    await waitFor(() => expect(screen.getByText("Admin Control Panel")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "API Analytics" }));
    await waitFor(() => expect(screen.getByText("100")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "50 rows" }));
    await waitFor(() =>
      expect((global.fetch as any).mock.calls.some((c: any[]) => String(c[0]).includes("limit=50"))).toBe(true)
    );
  });
});
