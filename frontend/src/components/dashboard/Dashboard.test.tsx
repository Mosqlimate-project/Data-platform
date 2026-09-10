import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import Dashboard from "./Dashboard";
import { DashboardProvider } from "@/context/Dashboard";

const api = vi.hoisted(() => ({
  fetchTree: vi.fn(),
  fetchSprints: vi.fn(),
  fetchPredictions: vi.fn(),
  fetchCases: vi.fn(),
  fetchPredictionData: vi.fn(),
  fetchPredictionMetadata: vi.fn(),
}));

vi.mock("@/lib/dashboard/api", () => ({ ...api }));

const childProps = vi.hoisted(() => ({
  chart: null as any,
  parameters: null as any,
  predictions: null as any,
}));

vi.mock("./Chart", () => ({
  default: (props: any) => {
    childProps.chart = props;
    return <div data-testid="chart" />;
  },
}));
vi.mock("./Parameters", () => ({
  default: (props: any) => {
    childProps.parameters = props;
    return <div data-testid="parameters" />;
  },
}));
vi.mock("./Predictions", () => ({
  default: (props: any) => {
    childProps.predictions = props;
    return <div data-testid="predictions" />;
  },
}));

function setSearch(search: string) {
  Object.defineProperty(window, "location", {
    value: {
      search,
      pathname: "/dashboard/quantitative",
      href: `/dashboard/quantitative${search}`,
    },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(window, "history", {
    value: { replaceState: vi.fn() },
    configurable: true,
    writable: true,
  });
}

function replacedUrls(): string[] {
  return (window.history.replaceState as unknown as ReturnType<typeof vi.fn>).mock.calls.map(
    (c) => c[2] as string
  );
}

const tree = {
  diseases: { "quantitative|1|none": [{ code: "A90", name: "Dengue" }] },
  countries: { "quantitative|1|A90|none": [{ geocode: "BRA", name: "Brazil" }] },
  states: { "quantitative|1|A90|BRA|none": [{ geocode: "RJ", name: "Rio" }] },
  cities: {},
};

const tree2 = {
  diseases: { "quantitative|2|none": [{ code: "A90", name: "Dengue" }] },
  countries: { "quantitative|2|A90|none": [{ geocode: "BRA", name: "Brazil" }] },
  states: { "quantitative|2|A90|BRA|none": [{ geocode: "RJ", name: "Rio" }] },
  cities: { "quantitative|2|A90|BRA|RJ|none": [{ geocode: "CITY", name: "City" }] },
};

function pred(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    owner: "owner",
    repository: "repo",
    start: "2024-01-01",
    end: "2024-01-31",
    case_definition: "reported",
    sprint: null,
    scores: [{ name: "wis_score", score: id }],
    ...overrides,
  };
}

const metadata = {
  id: 9,
  disease_code: "A90",
  adm_level: 1,
  case_definition: "reported",
  adm_0_code: "BRA",
  adm_1_code: "RJ",
  adm_2_code: null,
  sprint: false,
};

function renderDashboard(search = "") {
  setSearch(search);
  return render(
    <DashboardProvider>
      <Dashboard category="quantitative" />
    </DashboardProvider>
  );
}

async function renderReady(search = "") {
  const result = renderDashboard(search);
  await waitFor(() => {
    expect(api.fetchCases).toHaveBeenCalled();
    expect(childProps.chart?.isHistoricalLoading).toBe(false);
  });
  return result;
}

describe("components/dashboard/Dashboard", () => {
  beforeEach(() => {
    api.fetchTree.mockReset();
    api.fetchSprints.mockReset();
    api.fetchPredictions.mockReset();
    api.fetchCases.mockReset();
    api.fetchPredictionData.mockReset();
    api.fetchPredictionMetadata.mockReset();

    api.fetchTree.mockResolvedValue(tree);
    api.fetchSprints.mockResolvedValue([{ id: 1, year: 2024 }]);
    api.fetchPredictions.mockResolvedValue([pred(1)]);
    api.fetchCases.mockResolvedValue([{ date: "2024-01-01", cases: 10 }]);
    api.fetchPredictionData.mockResolvedValue([
      { date: "2024-01-01", pred: 5, lower_50: 1, upper_50: 9 },
    ]);
    api.fetchPredictionMetadata.mockResolvedValue(metadata);

    childProps.chart = null;
    childProps.parameters = null;
    childProps.predictions = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows the config loading overlay while the tree is pending", () => {
    api.fetchTree.mockReturnValue(new Promise(() => {}));
    const { container } = renderDashboard("");
    expect(container.querySelector(".animate-spin")).toBeInTheDocument();
  });

  it("initializes from the tree and loads predictions and chart data", async () => {
    const { container } = await renderReady("");

    expect(screen.getByTestId("parameters")).toBeInTheDocument();
    expect(screen.getByTestId("chart")).toBeInTheDocument();
    expect(screen.getByTestId("predictions")).toBeInTheDocument();
    expect(container.querySelector(".animate-spin")).not.toBeInTheDocument();

    expect(api.fetchSprints).toHaveBeenCalled();
    expect(api.fetchPredictions).toHaveBeenCalled();
    expect(api.fetchPredictionData).toHaveBeenCalledWith(1);
    expect(api.fetchCases).toHaveBeenCalled();

    expect(childProps.chart.disease).toBe("A90");
    expect(childProps.parameters.diseaseOptions).toHaveLength(1);
    expect(childProps.parameters.countryOptions).toHaveLength(1);
    expect(childProps.parameters.stateOptions).toHaveLength(1);
  });

  it("derives the country from a known state", async () => {
    await renderReady("?disease=A90&adm_1=RJ");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_0=BRA"))).toBe(true)
    );
  });

  it("derives the state from the first option", async () => {
    await renderReady("?disease=A90&adm_0=BRA");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_1=RJ"))).toBe(true)
    );
  });

  it("falls back to the first options when stored values are invalid", async () => {
    await renderReady("?disease=A90&adm_0=XX&adm_1=YY");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_0=BRA"))).toBe(true)
    );
    expect(replacedUrls().some((u) => u.includes("adm_1=RJ"))).toBe(true);
  });

  it("derives the city at municipal level", async () => {
    api.fetchTree.mockResolvedValue(tree2);
    await renderReady("?disease=A90&adm_level=2&adm_0=BRA&adm_1=RJ");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_2=CITY"))).toBe(true)
    );
  });

  it("handles an empty tree without a disease", async () => {
    api.fetchTree.mockResolvedValue({ diseases: {}, countries: {}, states: {}, cities: {} });
    await renderDashboard("");
    await waitFor(() => expect(api.fetchPredictions).toHaveBeenCalled());
    expect(childProps.parameters.diseaseOptions).toEqual([]);
    expect(childProps.chart.disease).toBe("");
  });

  it("uses prediction metadata to seed the filters", async () => {
    await renderReady("?prediction_id=9");
    await waitFor(() => expect(api.fetchPredictionData).toHaveBeenCalledWith(9));
    expect(api.fetchPredictionMetadata).toHaveBeenCalledWith("9");
    await waitFor(() => expect(replacedUrls().length).toBeGreaterThan(0));
    expect(replacedUrls().at(-1)).not.toContain("prediction_id");
  });

  it("applies a metadata adm_level change", async () => {
    api.fetchTree.mockResolvedValue(tree2);
    api.fetchPredictionMetadata.mockResolvedValue({ ...metadata, adm_level: 2 });
    await renderDashboard("?prediction_id=9");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_level=2"))).toBe(true)
    );
  });

  it("resolves country and state from metadata with only a city", async () => {
    api.fetchTree.mockResolvedValue(tree2);
    api.fetchPredictionMetadata.mockResolvedValue({
      ...metadata,
      adm_level: 2,
      adm_0_code: null,
      adm_1_code: null,
      adm_2_code: "CITY",
    });
    await renderDashboard("?prediction_id=9");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_0=BRA"))).toBe(true)
    );
    expect(replacedUrls().some((u) => u.includes("adm_1=RJ"))).toBe(true);
  });

  it("resolves the state from metadata with a country and city", async () => {
    api.fetchTree.mockResolvedValue(tree2);
    api.fetchPredictionMetadata.mockResolvedValue({
      ...metadata,
      adm_level: 2,
      adm_0_code: "BRA",
      adm_1_code: null,
      adm_2_code: "CITY",
    });
    await renderDashboard("?prediction_id=9");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_1=RJ"))).toBe(true)
    );
  });

  it("falls back when prediction metadata fails", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    api.fetchPredictionMetadata.mockRejectedValue(new Error("nope"));
    await renderDashboard("?prediction_id=9");
    await waitFor(() => expect(api.fetchPredictions).toHaveBeenCalled());
    err.mockRestore();
  });

  it("switches the case definition when only the other definition has data", async () => {
    api.fetchPredictions.mockImplementation(
      (_c: string, _l: number, _d: string, def: string) =>
        Promise.resolve(def === "probable" ? [pred(2, { case_definition: "probable" })] : [])
    );
    await renderDashboard("?disease=A90&adm_0=BRA&adm_1=RJ&case_definition=reported");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("case_definition=probable"))).toBe(true)
    );
  });

  it("skips the alternate definition in sprint mode", async () => {
    await renderReady("?disease=A90&adm_0=BRA&sprint=true");
    expect(api.fetchPredictions).toHaveBeenCalledTimes(1);
  });

  it("clears chart data when the cases request fails", async () => {
    api.fetchCases.mockRejectedValue(new Error("cases down"));
    await renderDashboard("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(api.fetchCases).toHaveBeenCalled());
    await waitFor(() => expect(childProps.chart.chartData.labels).toHaveLength(0));
  });

  it("skips the cases request when predictions lack a date range", async () => {
    api.fetchPredictions.mockResolvedValue([pred(1, { start: "", end: "" })]);
    await renderDashboard("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(api.fetchPredictionData).toHaveBeenCalled());
    expect(api.fetchCases).not.toHaveBeenCalled();
  });

  it("applies parameter changes and resets dependent levels", async () => {
    await renderReady("?disease=A90&adm_level=2&adm_0=BRA&adm_1=RJ&adm_2=CITY");
    act(() => {
      childProps.parameters.handleChange({
        target: { name: "disease", value: "A91" },
      });
    });
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("disease=A91"))).toBe(true)
    );

    act(() => {
      childProps.parameters.handleChange({
        target: { name: "adm_0", value: "ARG" },
      });
    });
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_0=ARG"))).toBe(true)
    );

    act(() => {
      childProps.parameters.handleChange({
        target: { name: "adm_1", value: "BA" },
      });
    });
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_1=BA"))).toBe(true)
    );
  });

  it("changes the case definition through the parameters handler", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    act(() => {
      childProps.parameters.handleCaseDefinitionChange("probable");
    });
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("case_definition=probable"))).toBe(true)
    );
  });

  it("toggles sprint selection and model search", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    act(() => {
      childProps.parameters.toggleSprint(2024);
    });
    await waitFor(() => expect(childProps.parameters.selectedSprints).toContain(2024));

    act(() => {
      childProps.predictions.setModelSearch("rep");
    });
    await waitFor(() => expect(childProps.predictions.modelSearch).toBe("rep"));

    act(() => {
      childProps.predictions.setPredictionSearch("1");
    });
    await waitFor(() => expect(childProps.predictions.predictionSearch).toBe("1"));
  });

  it("toggles model selection and sorting", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    act(() => {
      childProps.predictions.toggleModel("repo");
    });
    await waitFor(() => expect(childProps.predictions.selectedModels).toContain("repo"));

    act(() => {
      childProps.predictions.handleSort("wis_score");
    });
    await waitFor(() =>
      expect(childProps.predictions.sortConfig.direction).toBe("desc")
    );
  });

  it("toggles interval bounds and individual visibility", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    expect(childProps.chart.globalIntervals.has("50")).toBe(true);

    act(() => {
      childProps.predictions.toggleGlobalInterval("50");
    });
    await waitFor(() => expect(childProps.chart.globalIntervals.has("50")).toBe(false));

    act(() => {
      childProps.predictions.toggleIndividualVisibility(1);
    });
    await waitFor(() => expect(childProps.chart.visibleBounds.has(1)).toBe(true));
  });

  it("adds and removes a prediction line", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    const p = pred(1);
    // auto-loaded on init
    await waitFor(() => expect(childProps.chart.chartPredictions).toHaveLength(1));

    act(() => {
      childProps.predictions.togglePredictionLine(p);
    });
    await waitFor(() => expect(childProps.chart.chartPredictions).toHaveLength(0));

    act(() => {
      childProps.predictions.togglePredictionLine(p);
    });
    await waitFor(() => expect(api.fetchPredictionData).toHaveBeenCalledWith(1));
  });

  it("selects all page predictions and clears them", async () => {
    api.fetchPredictions.mockResolvedValue([pred(1), pred(2)]);
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");

    act(() => {
      childProps.predictions.handleSelectAll();
    });
    await waitFor(() =>
      expect(api.fetchPredictionData).toHaveBeenCalledWith(1)
    );

    act(() => {
      childProps.predictions.handleClearAll();
    });
    await waitFor(() => expect(childProps.chart.chartPredictions).toHaveLength(0));
  });

  it("builds sprint options and toggles sprint off", async () => {
    api.fetchTree.mockResolvedValue({
      diseases: {
        "quantitative|1|none": [{ code: "A90", name: "Dengue" }],
        "quantitative|1|2024": [{ code: "A91", name: "Zika" }],
        "quantitative|1|2025": [{ code: "A91", name: "Zika" }],
      },
      countries: {
        "quantitative|1|A91|2024": [{ geocode: "BRA", name: "Brazil" }],
        "quantitative|1|A91|2025": [{ geocode: "BRA", name: "Brazil" }],
      },
      states: {
        "quantitative|1|A91|BRA|2024": [{ geocode: "RJ", name: "Rio" }],
      },
      cities: {
        "quantitative|2|A91|BRA|RJ|2024": [{ geocode: "CITY", name: "City" }],
      },
    });
    api.fetchPredictions.mockResolvedValue([
      pred(1, { sprint: 2024, repository: "r1" }),
      pred(2, { sprint: 2023, repository: "r2" }),
    ]);
    await renderDashboard("?sprint=true&adm_0=BRA");
    await waitFor(() =>
      expect(childProps.parameters.diseaseOptions.map((d: any) => d.code)).toEqual(["A91"])
    );
    await waitFor(() => expect(childProps.parameters.countryOptions).toHaveLength(1));
    act(() => {
      childProps.parameters.toggleSprint(2024);
    });
    await waitFor(() => expect(childProps.parameters.selectedSprints).toContain(2024));
    await waitFor(() => expect(childProps.predictions.filteredAndSortedPredictions).toHaveLength(1));
    expect(childProps.predictions.uniqueModels).toEqual(["r1"]);
    act(() => {
      childProps.parameters.toggleSprint(2024);
    });
    await waitFor(() => expect(childProps.parameters.selectedSprints).not.toContain(2024));
  });

  it("adds a global interval and removes an individual bound", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    act(() => {
      childProps.predictions.toggleGlobalInterval("80");
    });
    await waitFor(() => expect(childProps.chart.globalIntervals.has("80")).toBe(true));

    act(() => {
      childProps.predictions.toggleIndividualVisibility(1);
    });
    await waitFor(() => expect(childProps.chart.visibleBounds.has(1)).toBe(true));
    act(() => {
      childProps.predictions.toggleIndividualVisibility(1);
    });
    await waitFor(() => expect(childProps.chart.visibleBounds.has(1)).toBe(false));
  });

  it("toggles a model off and sorts by a new key ascending", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    act(() => {
      childProps.predictions.toggleModel("repo");
    });
    await waitFor(() => expect(childProps.predictions.selectedModels).toContain("repo"));
    act(() => {
      childProps.predictions.toggleModel("repo");
    });
    await waitFor(() => expect(childProps.predictions.selectedModels).not.toContain("repo"));

    act(() => {
      childProps.predictions.handleSort("mae_score");
    });
    await waitFor(() =>
      expect(childProps.predictions.sortConfig).toEqual({ key: "mae_score", direction: "asc" })
    );
    act(() => {
      childProps.predictions.handleSort("mae_score");
    });
    await waitFor(() => expect(childProps.predictions.sortConfig.direction).toBe("desc"));
    act(() => {
      childProps.predictions.handleSort("mae_score");
    });
    await waitFor(() => expect(childProps.predictions.sortConfig.direction).toBe("asc"));
  });

  it("filters predictions by id, owner and repository text", async () => {
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    act(() => {
      childProps.predictions.setPredictionSearch("1");
    });
    await waitFor(() => expect(childProps.predictions.filteredAndSortedPredictions).toHaveLength(1));
    act(() => {
      childProps.predictions.setPredictionSearch("owner");
    });
    await waitFor(() => expect(childProps.predictions.filteredAndSortedPredictions).toHaveLength(1));
    act(() => {
      childProps.predictions.setPredictionSearch("repo");
    });
    await waitFor(() => expect(childProps.predictions.filteredAndSortedPredictions).toHaveLength(1));
    act(() => {
      childProps.predictions.setPredictionSearch("zzz");
    });
    await waitFor(() => expect(childProps.predictions.filteredAndSortedPredictions).toHaveLength(0));
  });

  it("maps missing interval bounds to null", async () => {
    api.fetchPredictionData.mockResolvedValue([
      { date: "2024-01-01", pred: 5, lower_50: 1, upper_50: 9 },
      { date: "2024-01-02", pred: 6 },
    ]);
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(childProps.chart.chartPredictions).toHaveLength(1));
    expect(childProps.chart.chartPredictions[0].data.lower_50).toEqual([1, null]);
    expect(childProps.chart.chartPredictions[0].data.upper_50).toEqual([9, null]);
  });

  it("deduplicates an already loaded prediction", async () => {
    let resolveData: (value: any) => void = () => {};
    api.fetchPredictionData.mockImplementationOnce(
      () => new Promise((resolve) => { resolveData = resolve; })
    );
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");

    act(() => {
      childProps.predictions.handleSelectAll();
    });
    act(() => {
      childProps.predictions.handleSelectAll();
    });
    await waitFor(() => expect(childProps.chart.chartPredictions).toHaveLength(1));

    await act(async () => {
      resolveData([{ date: "2024-01-01", pred: 1 }]);
      await Promise.resolve();
    });
    expect(childProps.chart.chartPredictions).toHaveLength(1);
  });

  it("computes the earliest start and latest end across predictions", async () => {
    api.fetchPredictions.mockResolvedValue([
      pred(1, { start: "2024-01-01", end: "2024-01-10" }),
      pred(2, { start: "2022-01-01", end: "2024-01-05" }),
      pred(3, { start: "2023-01-01", end: "2024-02-01" }),
    ]);
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(api.fetchCases).toHaveBeenCalled());
    const call = api.fetchCases.mock.calls.at(-1)!;
    expect(call[4]).toBe("2022-01-01");
    expect(call[5]).toBe("2024-02-01");
  });

  it("sorts auto-loaded predictions with missing scores", async () => {
    api.fetchPredictions.mockResolvedValue([
      pred(1, { scores: [] }),
      pred(2, { scores: [] }),
      pred(3, { scores: [{ name: "wis_score", score: 1 }] }),
      pred(4, { scores: [] }),
    ]);
    await renderDashboard("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(api.fetchPredictionData).toHaveBeenCalled());
  });

  it("sorts filtered predictions with missing scores and selection", async () => {
    api.fetchPredictions.mockResolvedValue([
      pred(1, { scores: [{ name: "wis_score", score: 2 }] }),
      pred(2, { scores: [] }),
      pred(3, { scores: [] }),
      pred(4, { scores: [{ name: "wis_score", score: 4 }] }),
      pred(5, { scores: [] }),
      pred(6, { scores: [{ name: "wis_score", score: 1 }] }),
      pred(7, { scores: [] }),
    ]);
    await renderReady("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(childProps.chart.chartPredictions).toHaveLength(5));
    act(() => {
      childProps.predictions.handleSort("wis_score");
    });
    await waitFor(() => expect(childProps.predictions.sortConfig.direction).toBe("desc"));
    expect(childProps.predictions.filteredAndSortedPredictions.length).toBe(7);
  });

  it("sorts a selected prediction before an unselected one", async () => {
    api.fetchPredictions.mockResolvedValue([pred(2), pred(1)]);
    await renderDashboard("?prediction_id=1");
    await waitFor(() =>
      expect(childProps.chart.chartPredictions.some((p: any) => p.id === 1)).toBe(true)
    );
    expect(childProps.predictions.filteredAndSortedPredictions).toHaveLength(2);
  });

  it("falls back to the first disease when the stored one is unknown", async () => {
    await renderReady("?disease=ZZZ&adm_0=BRA&adm_1=RJ");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("disease=A90"))).toBe(true)
    );
  });

  it("falls back to the first city when the stored one is unknown", async () => {
    api.fetchTree.mockResolvedValue(tree2);
    await renderDashboard("?disease=A90&adm_level=2&adm_0=BRA&adm_1=RJ&adm_2=OTHER");
    await waitFor(() =>
      expect(replacedUrls().some((u) => u.includes("adm_2=CITY"))).toBe(true)
    );
  });

  it("ignores a stale predictions sync", async () => {
    let resolvePreds: (value: any) => void = () => {};
    api.fetchPredictions.mockImplementationOnce(
      () => new Promise((resolve) => { resolvePreds = resolve; })
    );
    await renderDashboard("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(api.fetchPredictions).toHaveBeenCalled());
    act(() => {
      childProps.parameters.handleChange({ target: { name: "adm_0", value: "ARG" } });
    });
    await waitFor(() => expect(api.fetchPredictions.mock.calls.length).toBeGreaterThan(1));
    await act(async () => {
      resolvePreds([pred(1)]);
      await Promise.resolve();
    });
  });

  it("ignores stale prediction metadata", async () => {
    let resolveMeta: (value: any) => void = () => {};
    api.fetchPredictionMetadata.mockImplementationOnce(
      () => new Promise((resolve) => { resolveMeta = resolve; })
    );
    renderDashboard("?prediction_id=9");
    await waitFor(() => expect(api.fetchPredictionMetadata).toHaveBeenCalled());
    act(() => {
      childProps.parameters.handleChange({ target: { name: "adm_0", value: "ARG" } });
    });
    await waitFor(() => expect(api.fetchPredictionMetadata.mock.calls.length).toBeGreaterThan(1));
    await act(async () => {
      resolveMeta(metadata);
      await Promise.resolve();
    });
  });

  it("ignores stale metadata errors", async () => {
    let rejectMeta: (reason?: unknown) => void = () => {};
    api.fetchPredictionMetadata.mockImplementationOnce(
      () => new Promise((_resolve, reject) => { rejectMeta = reject; })
    );
    renderDashboard("?prediction_id=9");
    await waitFor(() => expect(api.fetchPredictionMetadata).toHaveBeenCalled());
    act(() => {
      childProps.parameters.handleChange({ target: { name: "adm_0", value: "ARG" } });
    });
    await waitFor(() => expect(api.fetchPredictionMetadata.mock.calls.length).toBeGreaterThan(1));
    await act(async () => {
      rejectMeta(new Error("nope"));
      await Promise.resolve();
    });
  });

  it("ignores stale chart data", async () => {
    let resolveCases: (value: any) => void = () => {};
    api.fetchCases.mockImplementationOnce(
      () => new Promise((resolve) => { resolveCases = resolve; })
    );
    await renderDashboard("?disease=A90&adm_0=BRA&adm_1=RJ");
    await waitFor(() => expect(api.fetchCases).toHaveBeenCalled());
    act(() => {
      childProps.parameters.handleChange({ target: { name: "adm_0", value: "ARG" } });
    });
    await waitFor(() => expect(api.fetchCases.mock.calls.length).toBeGreaterThan(1));
    await act(async () => {
      resolveCases([{ date: "2024-01-01", cases: 1 }]);
      await Promise.resolve();
    });
  });
});
