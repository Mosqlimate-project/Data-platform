import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardSidebar } from "./Sidebar";

const nav = vi.hoisted(() => ({ pathname: "/dashboard" }));
const ctx = vi.hoisted(() => ({
  state: { adm_level: 1 as number, sprint: false },
  updateState: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

vi.mock("@/context/Dashboard", () => ({
  useDashboard: () => ctx,
}));

const sections = [
  {
    id: "default",
    label: "Default",
    categories: [
      {
        id: "quantitative",
        label: "Quantitative",
        levels: [
          { id: "national", label: "National", url_slug: "national" },
          { id: "state", label: "State", url_slug: "state" },
          { id: "unknown", label: "Unknown", url_slug: "unknown" },
        ],
      },
      {
        id: "categorical",
        label: "Categorical",
        levels: [{ id: "national", label: "National", url_slug: "national" }],
      },
    ],
  },
  {
    id: "sprint",
    label: "Sprint",
    categories: [
      {
        id: "quantitative",
        label: "Quantitative",
        levels: [{ id: "municipal", label: "Municipal", url_slug: "municipal" }],
      },
    ],
  },
];

function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
    writable: true,
  });
}

describe("components/dashboard/Sidebar", () => {
  beforeEach(() => {
    nav.pathname = "/dashboard";
    ctx.state = { adm_level: 1, sprint: false };
    ctx.updateState.mockClear();
    setWidth(1600);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts expanded on wide viewports", () => {
    const { container } = render(<DashboardSidebar sections={sections} />);
    expect(container.firstChild).toHaveClass("w-64");
    expect(screen.getByText("navbar.dashboard")).toBeInTheDocument();
  });

  it("starts collapsed on narrow viewports", () => {
    setWidth(1000);
    const { container } = render(<DashboardSidebar sections={sections} />);
    expect(container.firstChild).toHaveClass("w-16");
  });

  it("responds to window resize events", () => {
    const { container } = render(<DashboardSidebar sections={sections} />);
    expect(container.firstChild).toHaveClass("w-64");

    act(() => {
      setWidth(1000);
      window.dispatchEvent(new Event("resize"));
    });
    expect(container.firstChild).toHaveClass("w-16");

    act(() => {
      setWidth(1600);
      window.dispatchEvent(new Event("resize"));
    });
    expect(container.firstChild).toHaveClass("w-64");
  });

  it("toggles open state via the collapse button", async () => {
    const { container } = render(<DashboardSidebar sections={sections} />);
    const toggle = container.querySelector(".lucide-panel-left-close")?.closest("button")!;
    await userEvent.click(toggle);
    expect(container.firstChild).toHaveClass("w-16");
  });

  it("renders translated section labels", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("dashboard.overview.general.title")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.imdc.title")).toBeInTheDocument();
  });

  it("shows category labels only when a section has multiple categories", () => {
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("Quantitative")).toBeInTheDocument();
    expect(screen.getByText("Categorical")).toBeInTheDocument();
  });

  it("builds level links with adm_level and sprint query params", () => {
    render(<DashboardSidebar sections={sections} />);
    const stateLink = screen.getByText("State").closest("a")!;
    expect(stateLink).toHaveAttribute(
      "href",
      "/dashboard/quantitative?adm_level=1&sprint=false"
    );
    const municipalLink = screen.getByText("Municipal").closest("a")!;
    expect(municipalLink).toHaveAttribute(
      "href",
      "/dashboard/quantitative?adm_level=2&sprint=true"
    );
  });

  it("highlights the active level link", () => {
    nav.pathname = "/dashboard/quantitative";
    ctx.state = { adm_level: 1, sprint: false };
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("State").closest("a")).toHaveClass("bg-accent");
  });

  it("does not highlight links for other sections or levels", () => {
    nav.pathname = "/dashboard/quantitative";
    ctx.state = { adm_level: 0, sprint: false };
    render(<DashboardSidebar sections={sections} />);
    expect(screen.getByText("State").closest("a")).not.toHaveClass("bg-accent");
  });

  it("updates dashboard state when a level is clicked", async () => {
    render(<DashboardSidebar sections={sections} />);
    const link = screen.getByText("State");
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(link);
    expect(ctx.updateState).toHaveBeenCalledWith({
      adm_level: 1,
      sprint: false,
      adm_0: "",
      adm_1: "",
      adm_2: "",
      prediction_id: null,
    });
  });

  it("falls back to adm_level 1 for unknown level ids", async () => {
    render(<DashboardSidebar sections={sections} />);
    const link = screen.getByText("Unknown");
    link.addEventListener("click", (e) => e.preventDefault());
    await userEvent.click(link);
    expect(ctx.updateState).toHaveBeenCalledWith(
      expect.objectContaining({ adm_level: 1 })
    );
  });

  it("handles missing sections gracefully", () => {
    const { container } = render(
      <DashboardSidebar sections={undefined as unknown as typeof sections} />
    );
    expect(container.querySelector("nav")).toBeInTheDocument();
  });

  it("marks the overview link active on the dashboard root", () => {
    nav.pathname = "/dashboard";
    render(<DashboardSidebar sections={sections} />);
    const overview = screen.getByText("dashboard.overview.overview").closest("a")!;
    expect(overview).toHaveClass("bg-accent");
  });

  it("falls back to the section label and tolerates missing categories and levels", () => {
    const sparse = [
      { id: "custom", label: "Custom Label" },
      { id: "default", label: "Default", categories: [{ id: "c", label: "C" }] },
    ] as unknown as typeof sections;
    render(<DashboardSidebar sections={sparse} />);
    expect(screen.getByText("Custom Label")).toBeInTheDocument();
    expect(screen.getByText("dashboard.overview.general.title")).toBeInTheDocument();
  });
});
