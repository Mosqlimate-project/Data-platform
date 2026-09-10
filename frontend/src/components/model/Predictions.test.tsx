import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import PredictionsList from "./Predictions";

const env = vi.hoisted(() => ({ secret: "shh" }));
vi.mock("@/lib/env", () => ({
  get FRONTEND_SECRET() {
    return env.secret;
  },
}));

const lineChart = vi.hoisted(() => ({ props: null as any }));
vi.mock("@/components/dashboard/QuantitativeLineChart", () => ({
  LineChart: (props: any) => {
    lineChart.props = props;
    return <div data-testid="line-chart" />;
  },
}));

vi.mock("@/components/model/MarkdownRenderer", () => ({
  default: ({ content }: any) => <div data-testid="md">{content}</div>,
}));

const chartRows = [
  {
    date: "2024-01-01",
    pred: 1,
    lower_50: 0.5,
    upper_50: 1.5,
    lower_80: 0.4,
    upper_80: 1.6,
    lower_90: 0.2,
    upper_90: 1.8,
    lower_95: 0.1,
    upper_95: 1.9,
  },
  { date: "2024-01-02", pred: 2 },
];

function makePrediction(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    date: "2024-01-01",
    commit: "e90c5c099e6d3043a41ab992bf3d9da02a83f150",
    description: "desc",
    start: "2024-01-01",
    end: "2024-01-31",
    case_definition: "reported",
    imdc_year: 2024,
    scores: [{ name: "wis_score", score: 1.234 }],
    published: true,
    disease_code: "A90",
    category: "quantitative",
    adm_level: 2,
    adm_0_name: "Brazil",
    adm_0_code: "BRA",
    adm_1_name: "RJ",
    adm_1_code: "33",
    adm_2_name: "Rio",
    adm_2_code: "3304557",
    ...overrides,
  };
}

function mockFetch() {
  global.fetch = vi.fn((url: string) => {
    const u = String(url);
    if (u.includes("/api/vis/dashboard/prediction/")) {
      return Promise.resolve({ ok: true, json: async () => ({ data: chartRows }) });
    }
    if (u.includes("/api/vis/dashboard/cases")) {
      return Promise.resolve({ ok: true, json: async () => [{ date: "2024-01-01", cases: 10 }] });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  }) as unknown as typeof fetch;
}

async function renderWithChart(overrides: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  mockFetch();
  const utils = render(<PredictionsList predictions={[makePrediction(overrides)]} {...props} />);
  await screen.findByTestId("line-chart");
  return utils;
}

function confirmDelete() {
  fireEvent.click(screen.getByRole("button", { name: "common.actions.delete" }));
}

describe("components/model/Predictions", () => {
  beforeEach(() => {
    env.secret = "shh";
    lineChart.props = null;
    vi.clearAllMocks();
  });

  describe("empty state", () => {
    it("renders the empty markdown for managers", () => {
      render(<PredictionsList predictions={[]} canManage owner="alice" modelName="repo" />);
      expect(screen.getAllByTestId("md").length).toBeGreaterThan(1);
    });

    it("renders the empty markdown for non-managers", () => {
      render(<PredictionsList predictions={[]} />);
      expect(screen.getByTestId("md")).toBeInTheDocument();
    });

    it("renders the empty markdown when predictions is undefined", () => {
      render(<PredictionsList predictions={undefined as any} />);
      expect(screen.getByTestId("md")).toBeInTheDocument();
    });
  });

  describe("stats and controls", () => {
    it("renders stat cards and auto-loads the first published chart", async () => {
      await renderWithChart();
      expect(screen.getByText("model_predictions.total_pred")).toBeInTheDocument();
      expect(screen.getAllByText("model_predictions.published").length).toBeGreaterThan(0);
      expect(screen.getByText("model_predictions.diseases")).toBeInTheDocument();
      expect(screen.getByText("model_predictions.score_range")).toBeInTheDocument();
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/vis/dashboard/prediction/1",
        expect.objectContaining({ headers: expect.objectContaining({ "x-internal-secret": "shh" }) })
      );
      expect(lineChart.props.predictions[0].id).toBe(1);
      expect(lineChart.props.globalIntervals.has("50")).toBe(true);
    });

    it("omits the score range stat when no scores match", async () => {
      mockFetch();
      render(<PredictionsList predictions={[makePrediction({ scores: [] })]} />);
      await screen.findByTestId("line-chart");
      expect(screen.queryByText("model_predictions.score_range")).not.toBeInTheDocument();
    });

    it("shows the disease filter and filters by disease", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01", disease_code: "B20" })]}
        />
      );
      await screen.findByTestId("line-chart");

      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "B20" } });
      expect(screen.queryByText("#1")).not.toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
    });

    it("changes the selected metric and reformats its name", async () => {
      await renderWithChart(makePrediction({
        scores: [
          { name: "wis_score", score: 1.234 },
          { name: "mae_score", score: 0.5 },
        ],
      }));
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[0], { target: { value: "mae_score" } });
      expect((selects[0] as HTMLSelectElement).value).toBe("mae_score");
    });

    it("sorts by score ascending and by id", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[
            makePrediction({ id: 1, date: "2024-01-01", scores: [{ name: "wis_score", score: 1.2 }] }),
            makePrediction({ id: 2, date: "2024-02-01", scores: [{ name: "wis_score", score: 0.4 }] }),
            makePrediction({ id: 3, date: "2024-03-01", scores: [] }),
            makePrediction({ id: 4, date: "2024-04-01", scores: [] }),
          ]}
        />
      );
      await screen.findByTestId("line-chart");
      const sort = screen.getAllByRole("combobox")[1];
      fireEvent.change(sort, { target: { value: "score-asc" } });
      fireEvent.change(sort, { target: { value: "score-desc" } });
      fireEvent.change(sort, { target: { value: "id-desc" } });
      fireEvent.change(sort, { target: { value: "id-asc" } });
      expect((sort as HTMLSelectElement).value).toBe("id-asc");
    });

    it("toggles between grid and list layouts", async () => {
      const { container } = await renderWithChart();
      expect(container.querySelector(".lucide-grid-3x3")).toBeInTheDocument();
      fireEvent.click(screen.getByTitle("model_predictions.list_view"));
      expect(container.querySelector("table")).toBeInTheDocument();
      fireEvent.click(screen.getByTitle("model_predictions.grid_view"));
      expect(container.querySelector(".lucide-grid-3x3")).toBeInTheDocument();
    });
  });

  describe("search and filters", () => {
    it("filters predictions by a search query after debounce", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[
            makePrediction(),
            makePrediction({ id: 2, date: "2024-02-01", disease_code: "B20", commit: "aaaa0000" }),
          ]}
        />
      );
      await screen.findByTestId("line-chart");

      fireEvent.change(screen.getByPlaceholderText("model_predictions.search_placeholder"), {
        target: { value: "B20" },
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
      expect(screen.queryByText("#1")).not.toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();
    });

    it("clears the search with the clear button", async () => {
      await renderWithChart();
      const input = screen.getByPlaceholderText("model_predictions.search_placeholder");
      fireEvent.change(input, { target: { value: "A90" } });
      const clear = input.closest("div")!.querySelector("button")!;
      fireEvent.click(clear);
      expect(input).toHaveValue("");
    });

    it("shows no_matches when the search yields no results", async () => {
      await renderWithChart();
      fireEvent.change(screen.getByPlaceholderText("model_predictions.search_placeholder"), {
        target: { value: "zzzznope" },
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
      expect(screen.getAllByText("model_predictions.no_matches").length).toBeGreaterThan(0);
    });

    it("filters drafts and published for managers", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01", published: false })]}
          canManage
        />
      );
      await screen.findByTestId("line-chart");

      fireEvent.click(screen.getByText(/model_predictions\.draft\s*\(/));
      expect(screen.queryByText("#1")).not.toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();

      fireEvent.click(screen.getByText(/model_predictions\.draft\s*\(/));
      expect(screen.getByText("#1")).toBeInTheDocument();

      fireEvent.click(screen.getByText(/model_predictions\.published\s*\(/));
      expect(screen.queryByText("#2")).not.toBeInTheDocument();
      expect(screen.getByText("#1")).toBeInTheDocument();

      fireEvent.click(screen.getByText(/model_predictions\.published\s*\(/));
      expect(screen.getByText("#2")).toBeInTheDocument();
    });

    it("filters by admin level and clears filters", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01", adm_level: 1 })]}
        />
      );
      await screen.findByTestId("line-chart");

      fireEvent.click(screen.getByRole("button", { name: "ADM 1" }));
      expect(screen.queryByText("#1")).not.toBeInTheDocument();
      expect(screen.getByText("#2")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "ADM 1" }));
      expect(screen.getByText("#1")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "ADM 1" }));
      fireEvent.click(screen.getByText("model_predictions.clear_filters"));
      expect(screen.getByText("#1")).toBeInTheDocument();
    });
  });

  describe("chart and table", () => {
    it("switches to the table view and renders bounds", async () => {
      const { container } = await renderWithChart();
      fireEvent.click(screen.getByTitle("model_predictions.view_table"));
      const table = container.querySelector("table")!;
      expect(table.textContent).toContain("model_predictions.table_date");
      expect(table.textContent).toContain("0.50");
      expect(table.textContent).toContain("1.80");
      expect(table.textContent).toContain("- / -");
      fireEvent.click(screen.getByTitle("model_predictions.view_chart"));
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("toggles interval buttons on and off", async () => {
      await renderWithChart();
      expect(screen.getByRole("button", { name: "50%" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "80%" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "95%" })).toBeInTheDocument();

      expect(lineChart.props.globalIntervals.has("50")).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "50%" }));
      expect(lineChart.props.globalIntervals.has("50")).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "50%" }));
      expect(lineChart.props.globalIntervals.has("50")).toBe(true);

      expect(lineChart.props.globalIntervals.has("80")).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "80%" }));
      expect(lineChart.props.globalIntervals.has("80")).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "80%" }));
      expect(lineChart.props.globalIntervals.has("80")).toBe(false);

      expect(lineChart.props.globalIntervals.has("90")).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "90%" }));
      expect(lineChart.props.globalIntervals.has("90")).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "90%" }));
      expect(lineChart.props.globalIntervals.has("90")).toBe(true);

      expect(lineChart.props.globalIntervals.has("95")).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: "95%" }));
      expect(lineChart.props.globalIntervals.has("95")).toBe(true);
      fireEvent.click(screen.getByRole("button", { name: "95%" }));
      expect(lineChart.props.globalIntervals.has("95")).toBe(false);
    });

    it("downloads a csv of the raw table data", async () => {
      const createObjectURL = vi.fn(() => "blob:url");
      vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      await renderWithChart();
      fireEvent.click(screen.getByTitle("model_predictions.download_csv"));

      expect(createObjectURL).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      vi.unstubAllGlobals();
      clickSpy.mockRestore();
    });

    it("does not download when there is no table data", async () => {
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      render(<PredictionsList predictions={[makePrediction()]} />);
      await screen.findByTitle("model_predictions.download_csv");
      fireEvent.click(screen.getByTitle("model_predictions.download_csv"));
      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("shows select_below when no chart is selected", async () => {
      render(<PredictionsList predictions={[makePrediction({ published: false })]} />);
      expect(screen.getByText("model_predictions.select_below")).toBeInTheDocument();
    });

    it("shows the loading spinner while fetching and then renders the chart", async () => {
      let resolvePred: (v: any) => void;
      global.fetch = vi.fn((url: string) => {
        if (String(url).includes("/cases")) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
        return new Promise((resolve) => {
          resolvePred = resolve;
        });
      }) as unknown as typeof fetch;
      render(<PredictionsList predictions={[makePrediction()]} />);
      await waitFor(() => expect(document.querySelector(".animate-spin")).toBeInTheDocument());
      act(() => {
        resolvePred!({ ok: true, json: async () => ({ data: chartRows }) });
      });
      await screen.findByTestId("line-chart");
    });

    it("shows unable_load when the chart fetch fails", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({ ok: false });
      render(<PredictionsList predictions={[makePrediction()]} />);
      await waitFor(() => expect(screen.getByText("model_predictions.unable_load")).toBeInTheDocument());
    });
  });

  describe("cards and rows", () => {
    it("re-clicks the active card without refetching and loads a different card", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01", scores: [{ name: "wis_score", score: 0.9 }] })]}
        />
      );
      await screen.findByTestId("line-chart");
      expect(global.fetch).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByText("#1").closest(".group")!);
      expect(global.fetch).toHaveBeenCalledTimes(2);

      fireEvent.click(screen.getByText("#2").closest(".group")!);
      await waitFor(() => expect(global.fetch).toHaveBeenCalledWith("/api/vis/dashboard/prediction/2", expect.anything()));
    });

    it("copies the prediction id to the clipboard", async () => {
      const writeText = vi.fn();
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      await renderWithChart();
      const copy = document.querySelector(".lucide-copy")!.closest("button")!;
      fireEvent.click(copy);
      expect(writeText).toHaveBeenCalledWith("1");
      expect(document.querySelector(".lucide-check")).toBeInTheDocument();
      vi.unstubAllGlobals();
    });

    it("toggles publish state and refreshes on success", async () => {
      await renderWithChart({}, { canManage: true });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      fireEvent.click(screen.getByRole("checkbox"));
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/registry/prediction/1/published",
          expect.objectContaining({ method: "PATCH" })
        )
      );
    });

    it("reverts publish state when the request fails", async () => {
      await renderWithChart({}, { canManage: true });
      (global.fetch as any).mockResolvedValueOnce({ ok: false });

      const checkbox = screen.getByRole("checkbox");
      fireEvent.click(checkbox);
      await waitFor(() => expect(checkbox).toBeChecked());
    });

    it("deletes a prediction from the modal", async () => {
      await renderWithChart({}, { canManage: true });
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      fireEvent.click(document.querySelector(".lucide-trash-2")!.closest("button")!);
      expect(screen.getByText("models.predictions.delete_confirm")).toBeInTheDocument();

      confirmDelete();
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith("/api/registry/predictions/1", { method: "DELETE" })
      );
      expect(screen.getAllByText("model_predictions.no_found").length).toBeGreaterThan(0);
    });

    it("cancels the delete modal", async () => {
      await renderWithChart({}, { canManage: true });
      fireEvent.click(document.querySelector(".lucide-trash-2")!.closest("button")!);
      fireEvent.click(screen.getByText("common.actions.cancel"));
      expect(screen.queryByText("models.predictions.delete_confirm")).not.toBeInTheDocument();
    });

    it("logs an error when the delete fails", async () => {
      const err = vi.spyOn(console, "error").mockImplementation(() => {});
      await renderWithChart({}, { canManage: true });
      (global.fetch as any).mockResolvedValueOnce({ ok: false });

      fireEvent.click(document.querySelector(".lucide-trash-2")!.closest("button")!);
      confirmDelete();
      await waitFor(() => expect(err).toHaveBeenCalled());
    });

    it("renders a draft badge and no dashboard link for unpublished predictions", async () => {
      render(<PredictionsList predictions={[makePrediction({ published: false })]} canManage />);
      expect(await screen.findByText("model_predictions.draft")).toBeInTheDocument();
      expect(screen.queryByTitle("model_predictions.view_dashboard")).not.toBeInTheDocument();
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });

    it("renders dashboard links for published predictions", async () => {
      await renderWithChart();
      const link = screen.getByTitle("model_predictions.view_dashboard");
      expect(link.getAttribute("href")).toContain("/dashboard/quantitative");
      expect(link.getAttribute("href")).toContain("adm_2=3304557");
      fireEvent.click(link);
    });

    it("builds a categorical dashboard link", async () => {
      await renderWithChart({ category: "categorical", start: null, end: null });
      const link = screen.getByTitle("model_predictions.view_dashboard");
      expect(link.getAttribute("href")).toContain("/dashboard/categorical");
    });

    it("renders a draft row in list view", async () => {
      mockFetch();
      render(<PredictionsList predictions={[makePrediction({ published: false })]} canManage />);
      fireEvent.click(screen.getByTitle("model_predictions.list_view"));
      expect(screen.getAllByText("model_predictions.draft").length).toBeGreaterThan(0);
      const trash = document.querySelector(".lucide-trash-2")!.closest("button")!;
      fireEvent.click(trash);
      expect(screen.getByText("models.predictions.delete_confirm")).toBeInTheDocument();
    });

    it("styles active and draft rows differently in list view", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[
            makePrediction({ id: 1 }),
            makePrediction({ id: 2, date: "2024-02-01", published: false, scores: [] }),
          ]}
          canManage
        />
      );
      await screen.findByTestId("line-chart");
      fireEvent.click(screen.getByTitle("model_predictions.list_view"));

      const rows = document.querySelectorAll("tbody tr");
      expect(rows.length).toBe(2);
      expect(rows[0].className).toContain("opacity-70");
      expect(rows[1].className).toContain("ring-primary");
      expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    });

    it("omits the score label in list view when no metric is selected", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction({ scores: [] }), makePrediction({ id: 2, date: "2024-02-01", scores: [] })]}
        />
      );
      await screen.findByTestId("line-chart");
      fireEvent.click(screen.getByTitle("model_predictions.list_view"));
      expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    });

    it("loads a chart and toggles publish from the list view rows", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01" })]}
          canManage
        />
      );
      await screen.findByTestId("line-chart");
      fireEvent.click(screen.getByTitle("model_predictions.list_view"));

      const rows = document.querySelectorAll("tbody tr");
      fireEvent.click(rows[0]);
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith("/api/vis/dashboard/prediction/2", expect.anything())
      );

      (global.fetch as any).mockResolvedValueOnce({ ok: true });
      fireEvent.click(screen.getAllByRole("checkbox")[0]);
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/registry/prediction/2/published",
          expect.objectContaining({ method: "PATCH" })
        )
      );
    });

    it("handles a prediction with an empty date and no location codes", async () => {
      await renderWithChart({
        date: "",
        start: null,
        end: null,
        adm_0_name: "",
        adm_1_name: null,
        adm_2_name: null,
        adm_0_code: "",
        adm_1_code: null,
        adm_2_code: null,
        imdc_year: null,
        case_definition: "",
      });
      expect(screen.getByText("model_predictions.prediction_id")).toBeInTheDocument();
    });

    it("shows the select placeholder when the active prediction is removed", async () => {
      mockFetch();
      const { rerender } = render(
        <PredictionsList
          predictions={[
            makePrediction({ id: 1 }),
            makePrediction({ id: 2, date: "2024-02-01" }),
          ]}
        />
      );
      await screen.findByTestId("line-chart");
      expect(screen.getByText("model_predictions.prediction_id")).toBeInTheDocument();

      rerender(<PredictionsList predictions={[makePrediction({ id: 2, date: "2024-02-01" })]} />);
      expect(screen.getByText("model_predictions.select_prediction")).toBeInTheDocument();
    });

    it("toggles one prediction without touching the others", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01" })]}
          canManage
        />
      );
      await screen.findByTestId("line-chart");
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      fireEvent.click(screen.getAllByRole("checkbox")[0]);
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/registry/prediction/2/published",
          expect.objectContaining({ method: "PATCH" })
        )
      );
    });

    it("reverts only the changed prediction when the request fails", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01" })]}
          canManage
        />
      );
      await screen.findByTestId("line-chart");
      (global.fetch as any).mockResolvedValueOnce({ ok: false });

      const checkboxes = screen.getAllByRole("checkbox");
      fireEvent.click(checkboxes[0]);
      await waitFor(() => expect(checkboxes[0]).toBeChecked());
      expect(checkboxes[1]).toBeChecked();
    });

    it("deletes a non-active prediction and keeps the chart", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[makePrediction(), makePrediction({ id: 2, date: "2024-02-01" })]}
          canManage
        />
      );
      await screen.findByTestId("line-chart");
      (global.fetch as any).mockResolvedValueOnce({ ok: true });

      const trashes = document.querySelectorAll(".lucide-trash-2");
      fireEvent.click(trashes[0].closest("button")!);
      confirmDelete();
      await waitFor(() =>
        expect(global.fetch).toHaveBeenCalledWith("/api/registry/predictions/2", { method: "DELETE" })
      );
      expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    });

    it("sends an empty internal secret when FRONTEND_SECRET is unset", async () => {
      env.secret = "";
      mockFetch();
      render(<PredictionsList predictions={[makePrediction()]} />);
      await screen.findByTestId("line-chart");
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/vis/dashboard/prediction/1",
        expect.objectContaining({ headers: expect.objectContaining({ "x-internal-secret": "" }) })
      );
    });

    it("handles a prediction response that is not wrapped in a data field", async () => {
      global.fetch = vi.fn((url: string) => {
        if (String(url).includes("/api/vis/dashboard/prediction/")) {
          return Promise.resolve({ ok: true, json: async () => chartRows });
        }
        return Promise.resolve({ ok: true, json: async () => [] });
      }) as unknown as typeof fetch;
      render(<PredictionsList predictions={[makePrediction()]} />);
      await screen.findByTestId("line-chart");
      expect(lineChart.props.predictions[0].data.data).toHaveLength(2);
    });

    it("builds case params without an imdc year and with the default case definition", async () => {
      mockFetch();
      render(<PredictionsList predictions={[makePrediction({ imdc_year: null, case_definition: "" })]} />);
      await screen.findByTestId("line-chart");
      const casesCall = (global.fetch as any).mock.calls
        .map((c: any) => String(c[0]))
        .find((u: string) => u.includes("/api/vis/dashboard/cases"));
      expect(casesCall).toContain("sprint=false");
      expect(casesCall).toContain("case_definition=reported");
    });

    it("ignores a failed cases fetch", async () => {
      global.fetch = vi.fn((url: string) => {
        if (String(url).includes("/api/vis/dashboard/prediction/")) {
          return Promise.resolve({ ok: true, json: async () => ({ data: chartRows }) });
        }
        return Promise.resolve({ ok: false });
      }) as unknown as typeof fetch;
      render(<PredictionsList predictions={[makePrediction()]} />);
      await screen.findByTestId("line-chart");
      expect(lineChart.props.predictions[0].id).toBe(1);
    });

    it("includes adm_3 in the dashboard link and omits empty adm_0", async () => {
      await renderWithChart({ adm_level: 3, adm_0_code: "", adm_3_code: "X3" });
      const link = screen.getByTitle("model_predictions.view_dashboard");
      expect(link.getAttribute("href")).toContain("adm_3=X3");
      expect(link.getAttribute("href")).not.toContain("adm_0=");
    });

    it("searches against the metric score value", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={[
            makePrediction(),
            makePrediction({ id: 2, date: "2024-02-01", scores: [] }),
          ]}
        />
      );
      await screen.findByTestId("line-chart");
      fireEvent.change(screen.getByPlaceholderText("model_predictions.search_placeholder"), {
        target: { value: "1.234" },
      });
      await act(async () => {
        await new Promise((r) => setTimeout(r, 350));
      });
      expect(screen.getByText("#1")).toBeInTheDocument();
      expect(screen.queryByText("#2")).not.toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    function manyPredictions() {
      return Array.from({ length: 100 }, (_, i) =>
        makePrediction({
          id: i + 1,
          date: `2024-01-${String((i % 28) + 1).padStart(2, "0")}`,
          adm_1_name: i % 2 === 0 ? "RJ" : "SP",
        })
      );
    }

    it("paginates and navigates pages", async () => {
      mockFetch();
      render(<PredictionsList predictions={manyPredictions()} />);
      await screen.findByTestId("line-chart");

      expect(screen.getByText("model_predictions.pred_count")).toBeInTheDocument();
      expect(screen.getByText("...")).toBeInTheDocument();

      const next = document.querySelector(".lucide-chevron-right")!.closest("button")! as HTMLButtonElement;
      fireEvent.click(next);
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "9" }));
      expect(next.disabled).toBe(true);
      const prev = document.querySelector(".lucide-chevron-left")!.closest("button")! as HTMLButtonElement;
      fireEvent.click(prev);
      expect(screen.getByRole("button", { name: "8" })).toBeInTheDocument();
    });

    it("changes the page size", async () => {
      mockFetch();
      render(<PredictionsList predictions={manyPredictions()} />);
      await screen.findByTestId("line-chart");
      const selects = screen.getAllByRole("combobox");
      const pageSize = selects[selects.length - 1] as HTMLSelectElement;
      fireEvent.change(pageSize, { target: { value: "24" } });
      expect(pageSize.value).toBe("24");
    });

    it("renders page buttons when there are multiple pages", async () => {
      mockFetch();
      render(
        <PredictionsList
          predictions={Array.from({ length: 13 }, (_, i) => makePrediction({ id: i + 1, date: `2024-02-${String(i + 1).padStart(2, "0")}` }))}
        />
      );
      await screen.findByTestId("line-chart");
      expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
    });
  });
});
