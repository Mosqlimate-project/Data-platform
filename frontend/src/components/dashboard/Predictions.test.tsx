import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardPredictions from "./Predictions";
import type { Prediction } from "@/lib/dashboard/api";

function makePrediction(overrides: Partial<Prediction> = {}): Prediction {
  return {
    id: 1,
    owner: "owner",
    repository: "repo",
    start: "2024-01-01",
    end: "2024-01-31",
    case_definition: "reported",
    sprint: null,
    scores: [
      { name: "wis_score", score: 1.234 },
      { name: "mae_score", score: null },
    ],
    ...overrides,
  };
}

function makeProps(overrides: Record<string, unknown> = {}) {
  const prediction = makePrediction();
  return {
    uniqueModels: ["repo"],
    modelSearch: "",
    setModelSearch: vi.fn(),
    selectedModels: [] as string[],
    toggleModel: vi.fn(),
    predictionSearch: "",
    setPredictionSearch: vi.fn(),
    predictionsLoading: false,
    filteredAndSortedPredictions: [prediction],
    paginatedPredictions: [prediction],
    chartPredictions: [],
    loadingPredictions: [] as number[],
    globalIntervals: new Set(["50", "90"]),
    toggleGlobalInterval: vi.fn(),
    visibleBounds: new Set<number>(),
    toggleIndividualVisibility: vi.fn(),
    togglePredictionLine: vi.fn(),
    handleSort: vi.fn(),
    sortConfig: { key: "wis_score", direction: "asc" as const },
    handleSelectAll: vi.fn(),
    handleClearAll: vi.fn(),
    currentPage: 1,
    setCurrentPage: vi.fn(),
    totalPages: 1,
    itemsPerPage: 15,
    ...overrides,
  };
}

describe("components/dashboard/Predictions", () => {
  it("renders model buttons and toggles a model", async () => {
    const toggleModel = vi.fn();
    render(<DashboardPredictions {...makeProps({ toggleModel, uniqueModels: ["repo", "other"] })} />);
    await userEvent.click(screen.getByRole("button", { name: "other" }));
    expect(toggleModel).toHaveBeenCalledWith("other");
  });

  it("updates the model search", () => {
    const setModelSearch = vi.fn();
    render(<DashboardPredictions {...makeProps({ setModelSearch })} />);
    fireEvent.change(screen.getByPlaceholderText("dashboard.search.models"), {
      target: { value: "rep" },
    });
    expect(setModelSearch).toHaveBeenCalledWith("rep");
  });

  it("updates the prediction search", () => {
    const setPredictionSearch = vi.fn();
    render(<DashboardPredictions {...makeProps({ setPredictionSearch })} />);
    fireEvent.change(screen.getByPlaceholderText("dashboard.search.predictions"), {
      target: { value: "42" },
    });
    expect(setPredictionSearch).toHaveBeenCalledWith("42");
  });

  it("derives score columns and renders formatted scores", () => {
    render(<DashboardPredictions {...makeProps()} />);
    expect(screen.getByText("WIS")).toBeInTheDocument();
    expect(screen.getByText("MAE")).toBeInTheDocument();
    expect(screen.getByText("1.23")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("tolerates predictions without scores", () => {
    const prediction = makePrediction({ scores: undefined as unknown as Prediction["scores"] });
    render(
      <DashboardPredictions
        {...makeProps({ filteredAndSortedPredictions: [prediction], paginatedPredictions: [prediction] })}
      />
    );
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("calls handleSort when a score header is clicked", async () => {
    const handleSort = vi.fn();
    render(<DashboardPredictions {...makeProps({ handleSort })} />);
    await userEvent.click(screen.getByText("WIS"));
    expect(handleSort).toHaveBeenCalledWith("wis_score");
  });

  it("renders the row details and selects a prediction line on click", async () => {
    const togglePredictionLine = vi.fn();
    const { container } = render(<DashboardPredictions {...makeProps({ togglePredictionLine })} />);
    expect(screen.getByText("owner")).toBeInTheDocument();
    expect(container.querySelector("tbody")?.textContent).toContain("repo");
    expect(screen.getByText("2024-01-01 - 2024-01-31")).toBeInTheDocument();
    await userEvent.click(screen.getByText("2024-01-01 - 2024-01-31"));
    expect(togglePredictionLine).toHaveBeenCalled();
  });

  it("shows a spinner while a prediction is loading", () => {
    const { container } = render(
      <DashboardPredictions {...makeProps({ loadingPredictions: [1] })} />
    );
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
    expect(container.querySelector("tbody .animate-spin")).toBeInTheDocument();
  });

  it("toggles individual bound visibility without selecting the row", async () => {
    const toggleIndividualVisibility = vi.fn();
    const togglePredictionLine = vi.fn();
    const { container } = render(
      <DashboardPredictions {...makeProps({ toggleIndividualVisibility, togglePredictionLine })} />
    );
    const eyeButton = container.querySelector("tbody tr button") as HTMLButtonElement;
    await userEvent.click(eyeButton);
    expect(toggleIndividualVisibility).toHaveBeenCalledWith(1);
    expect(togglePredictionLine).not.toHaveBeenCalled();
  });

  it("styles the eye button when bounds are visible", () => {
    const { container } = render(
      <DashboardPredictions {...makeProps({ visibleBounds: new Set([1]) })} />
    );
    const eyeButton = container.querySelector("tbody tr button") as HTMLButtonElement;
    expect(eyeButton.className).toContain("bg-blue-500/20");
  });

  it("toggles interval checkboxes", async () => {
    const toggleGlobalInterval = vi.fn();
    render(<DashboardPredictions {...makeProps({ toggleGlobalInterval })} />);
    const checkbox = screen.getByRole("checkbox", { name: /50%/ });
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    expect(toggleGlobalInterval).toHaveBeenCalledWith("50");
  });

  it("invokes select-all and clear-all actions", async () => {
    const handleSelectAll = vi.fn();
    const handleClearAll = vi.fn();
    render(<DashboardPredictions {...makeProps({ handleSelectAll, handleClearAll })} />);
    await userEvent.click(screen.getByText("dashboard.actions.select_10"));
    await userEvent.click(screen.getByText("dashboard.actions.clear"));
    expect(handleSelectAll).toHaveBeenCalled();
    expect(handleClearAll).toHaveBeenCalled();
  });

  it("disables prev/next on a single page", () => {
    render(<DashboardPredictions {...makeProps({ totalPages: 1, currentPage: 1 })} />);
    const buttons = screen.getAllByRole("button");
    const chevrons = buttons.filter((b) => b.querySelector("svg"));
    expect(chevrons.some((b) => (b as HTMLButtonElement).disabled)).toBe(true);
  });

  it("renders the first five pages when totalPages <= 5", () => {
    render(<DashboardPredictions {...makeProps({ totalPages: 3, currentPage: 2 })} />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
  });

  it("shifts the page window when near the start", () => {
    render(<DashboardPredictions {...makeProps({ totalPages: 10, currentPage: 2 })} />);
    expect(screen.getByRole("button", { name: "1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "5" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "6" })).not.toBeInTheDocument();
  });

  it("shifts the page window in the middle", () => {
    render(<DashboardPredictions {...makeProps({ totalPages: 10, currentPage: 5 })} />);
    expect(screen.getByRole("button", { name: "3" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "7" })).toBeInTheDocument();
  });

  it("shifts the page window near the end", () => {
    render(<DashboardPredictions {...makeProps({ totalPages: 10, currentPage: 9 })} />);
    expect(screen.getByRole("button", { name: "6" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10" })).toBeInTheDocument();
  });

  it("uses updater functions for pagination controls", async () => {
    const setCurrentPage = vi.fn();
    render(<DashboardPredictions {...makeProps({ totalPages: 3, currentPage: 2, setCurrentPage })} />);

    await userEvent.click(screen.getByRole("button", { name: "1" }));
    expect(setCurrentPage).toHaveBeenCalledWith(1);

    const prevButton = document.querySelector(".lucide-chevron-left")?.closest("button") as HTMLButtonElement;
    const nextButton = document.querySelector(".lucide-chevron-right")?.closest("button") as HTMLButtonElement;
    await userEvent.click(prevButton);
    const prevUpdater = setCurrentPage.mock.calls.at(-1)![0];
    expect(prevUpdater(2)).toBe(1);

    await userEvent.click(nextButton);
    const nextUpdater = setCurrentPage.mock.calls.at(-1)![0];
    expect(nextUpdater(2)).toBe(3);
  });

  it("renders the showing range text", () => {
    render(
      <DashboardPredictions
        {...makeProps({
          totalPages: 2,
          currentPage: 1,
          itemsPerPage: 10,
          filteredAndSortedPredictions: new Array(12).fill(makePrediction()),
        })}
      />
    );
    expect(screen.getByText(/dashboard.pagination.showing/)).toBeInTheDocument();
  });

  it("highlights a selected model", () => {
    render(<DashboardPredictions {...makeProps({ selectedModels: ["repo"] })} />);
    expect(screen.getByRole("button", { name: "repo" }).className).toContain("bg-blue-500/10");
  });

  it("renders a descending sort indicator", () => {
    const { container } = render(
      <DashboardPredictions {...makeProps({ sortConfig: { key: "wis_score", direction: "desc" } })} />
    );
    expect(container.querySelector(".lucide-arrow-down")).toBeInTheDocument();
  });

  it("styles a selected prediction row", () => {
    const { container } = render(
      <DashboardPredictions
        {...makeProps({
          chartPredictions: [
            {
              id: 1,
              color: "#123456",
              data: { labels: [], data: [] },
            },
          ],
        })}
      />
    );
    const row = container.querySelector("tbody tr") as HTMLTableRowElement;
    expect(row.style.backgroundColor).toContain("18, 52, 86");
  });
});
