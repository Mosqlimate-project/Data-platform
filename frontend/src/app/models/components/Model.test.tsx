import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Thumbnail from "./Model";

const nav = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: nav.push, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = 2_000_000_000_000;

const base = {
  owner: "owner",
  repo: "repo",
  avatar_url: null as string | null,
  diseases: ["dengue"],
  predictions: 0,
  last_update: NOW,
  adm_levels: ["ADM 1"],
};

describe("app/models/components/Model", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the thumbnail and navigates on click", () => {
    render(<Thumbnail {...base} />);
    expect(screen.getByText("repo")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(screen.getByText("dengue")).toBeInTheDocument();
    expect(screen.getByText("ADM 1")).toBeInTheDocument();
    expect(screen.getByText("0 predicts")).toBeInTheDocument();

    fireEvent.click(screen.getByText("repo"));
    expect(nav.push).toHaveBeenCalledWith("/owner/repo");
  });

  it("falls back to the default image on error", () => {
    render(<Thumbnail {...base} />);
    const img = screen.getByAltText("repo") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("/mosquito.svg");
    fireEvent.error(img);
    expect(img.getAttribute("src")).toBe("/mosquito.svg");
  });

  it("uses the provided avatar and formats predictions", () => {
    render(
      <Thumbnail
        {...base}
        avatar_url="https://img"
        predictions={1234}
        category="quantitative"
        time_resolution="weekly"
        imdc="2024"
      />
    );
    expect((screen.getByAltText("repo") as HTMLImageElement).getAttribute("src")).toBe("https://img");
    expect(screen.getByText("1,234 predicts")).toBeInTheDocument();
    expect(screen.getByText("quantitative")).toBeInTheDocument();
    expect(screen.getByText("weekly")).toBeInTheDocument();
    expect(screen.getByText("2024")).toBeInTheDocument();
  });

  it.each([
    [30_000, "just now"],
    [120_000, "2 minutes ago"],
    [60_000, "1 minute ago"],
    [3_600_000, "1 hour ago"],
    [7_200_000, "2 hours ago"],
    [2 * 86_400_000, "2 days ago"],
    [86_400_000, "1 day ago"],
    [2 * 2_592_000_000, "2 months ago"],
    [2_592_000_000, "1 month ago"],
    [2 * 31_536_000_000, "2 years ago"],
    [31_536_000_000, "1 year ago"],
  ])("formats a relative time for %i ms", (offset, expected) => {
    render(<Thumbnail {...base} last_update={NOW - offset} />);
    expect(screen.getByText(expected)).toBeInTheDocument();
  });

  it("renders nothing for a zero timestamp", () => {
    render(<Thumbnail {...base} last_update={0} />);
    expect(screen.getByText("0 predicts")).toBeInTheDocument();
    expect(screen.queryByText(/ago/)).not.toBeInTheDocument();
  });
});
