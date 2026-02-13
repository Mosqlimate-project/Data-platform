"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Search, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LineChart, QuantitativePrediction } from "@/components/dashboard/QuantitativeLineChart";
import MarkdownRenderer from "@/components/model/MarkdownRenderer";

interface PredictionScore {
  name: string;
  score: number;
}

export interface ModelPrediction {
  id: number;
  date: string;
  commit: string;
  description?: string | null;
  start?: string | null;
  end?: string | null;
  case_definition: string;
  sprint?: number | null;
  scores: PredictionScore[];
  published?: boolean;
  disease_code: string;
  category: string;
  adm_level: number;
  adm_0_name: string;
  adm_0_code: string;
  adm_1_name?: string | null;
  adm_1_code?: string | null;
  adm_2_name?: string | null;
  adm_2_code?: string | null;
  adm_3_name?: string | null;
  adm_3_code?: string | null;
}

interface PredictionRowData {
  date: string;
  pred: number;
  lower_50?: number;
  upper_50?: number;
  lower_90?: number;
  upper_90?: number;
}

interface PredictionsListProps {
  predictions: ModelPrediction[];
  canManage?: boolean;
  owner?: string;
  modelName?: string;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const PredictionCard = memo(function PredictionCard({
  pred,
  canManage,
  selectedMetric,
  isUpdating,
  isActiveChart,
  onToggle,
  onViewChart,
  formatDate,
  formatScoreName,
  getDashboardLink,
  t,
}: {
  pred: ModelPrediction;
  canManage: boolean;
  selectedMetric: string;
  isUpdating: boolean;
  isActiveChart: boolean;
  onToggle: (id: number, status: boolean) => void;
  onViewChart: (pred: ModelPrediction) => void;
  formatDate: (d: string) => string;
  formatScoreName: (s: string) => string;
  getDashboardLink: (pred: ModelPrediction) => string;
  t: (key: string, options?: any) => string;
}) {
  const activeScore = pred.scores?.find((s) => s.name === selectedMetric);
  const dashboardUrl = getDashboardLink(pred);

  return (
    <div
      onClick={() => onViewChart(pred)}
      className={`group flex flex-col border rounded-xl overflow-hidden bg-card transition-all duration-200 cursor-pointer ${isActiveChart ? "ring-2 ring-primary border-primary" : "hover:shadow-md"
        } ${canManage && !pred.published ? "opacity-75 border-dashed border-yellow-400/50" : ""}`}
    >
      <div className="px-4 py-2 bg-muted/20 border-b flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground">
          #{pred.id}
        </span>

        <div className="flex items-center gap-3">
          {canManage && (
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={!!pred.published}
                disabled={isUpdating}
                onChange={() => onToggle(pred.id, !!pred.published)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer disabled:opacity-50"
                id={`publish-${pred.id}`}
              />
              <label
                htmlFor={`publish-${pred.id}`}
                className={`text-[10px] uppercase font-semibold text-muted-foreground cursor-pointer select-none ${isUpdating ? "opacity-50" : ""
                  }`}
              >
                {isUpdating ? t("model_predictions.saving") : t("model_predictions.published")}
              </label>
            </div>
          )}

          <div className="h-4 w-px bg-border mx-1"></div>

          <Link
            href={dashboardUrl}
            onClick={(e) => e.stopPropagation()}
            className="text-muted-foreground hover:text-primary transition-colors"
            title={t("model_predictions.view_dashboard")}
          >
            <LayoutDashboard size={16} />
          </Link>
        </div>
      </div>

      <div className="p-5 flex-1 space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="font-semibold text-foreground" suppressHydrationWarning>
              {formatDate(pred.date)}
            </div>
          </div>
          <div className="px-2 py-1 bg-muted rounded text-xs font-mono text-muted-foreground">
            {pred.commit.substring(0, 7)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-sm">
            {pred.adm_0_name && <span className="font-medium text-foreground"> {pred.adm_0_name} </span>}
            {pred.adm_1_name && <span className="text-muted-foreground"> {pred.adm_1_name}</span>}
            {pred.adm_2_name && <span className="text-muted-foreground"> {pred.adm_2_name}</span>}
            {pred.adm_3_name && <span className="text-muted-foreground"> {pred.adm_3_name}</span>}
          </div>
        </div>

        {pred.start && pred.end && (
          <div className="space-y-1">
            <div className="text-sm flex items-center gap-2">
              <span className="text-foreground" suppressHydrationWarning>{formatDate(pred.start)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-foreground" suppressHydrationWarning>{formatDate(pred.end)}</span>
            </div>
          </div>
        )}

        {pred.sprint && (
          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
            IMDC {pred.sprint}
          </div>
        )}
      </div>

      <div className="bg-muted/30 p-4 border-t flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          {selectedMetric ? formatScoreName(selectedMetric) : "SCORE"}
        </span>
        <span className="text-xl font-bold font-mono text-primary">
          {activeScore ? activeScore.score.toFixed(4) : "-"}
        </span>
      </div>
    </div>
  );
});

export default function PredictionsList({
  predictions,
  canManage = false,
  owner = "owner",
  modelName = "model"
}: PredictionsListProps) {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();

  const [localPredictions, setLocalPredictions] = useState<ModelPrediction[]>(predictions || []);
  const availableScores =
    localPredictions.find((p) => p.scores && p.scores.length > 0)?.scores.map((s) => s.name) || [];
  const [selectedMetric, setSelectedMetric] = useState<string>(availableScores[0] || "");
  const [isUpdating, setIsUpdating] = useState<number | null>(null);

  const [inputValue, setInputValue] = useState("");
  const debouncedSearchQuery = useDebounce(inputValue, 300);

  const [activeChartId, setActiveChartId] = useState<number | null>(null);
  const [chartData, setChartData] = useState<QuantitativePrediction | null>(null);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    setLocalPredictions(predictions || []);
  }, [predictions]);

  const formatScoreName = useCallback((name: string) => {
    return name.replace("_score", "").toUpperCase();
  }, []);

  const formatDate = useCallback(
    (dateString: string) => {
      if (!dateString) return "";
      return new Date(dateString).toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
    },
    [i18n.language]
  );

  const handlePublishToggle = useCallback(
    async (id: number, currentStatus: boolean) => {
      const newStatus = !currentStatus;
      setLocalPredictions((prev) => prev.map((p) => (p.id === id ? { ...p, published: newStatus } : p)));
      setIsUpdating(id);

      try {
        const res = await fetch(`/api/registry/prediction/${id}/published`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ published: newStatus }),
        });
        if (!res.ok) throw new Error("Failed to update status");
        router.refresh();
      } catch (error) {
        console.error(error);
        setLocalPredictions((prev) => prev.map((p) => (p.id === id ? { ...p, published: currentStatus } : p)));
        alert("Failed to update status");
      } finally {
        setIsUpdating(null);
      }
    },
    [router]
  );

  const handleViewChart = useCallback(async (pred: ModelPrediction) => {
    if (activeChartId === pred.id) return;

    setActiveChartId(pred.id);
    setIsChartLoading(true);
    setChartData(null);

    try {
      const res = await fetch(`/api/vis/dashboard/prediction/${pred.id}`);
      if (!res.ok) throw new Error("Failed to fetch chart data");

      const data: PredictionRowData[] = await res.json();

      const formattedData: QuantitativePrediction = {
        id: pred.id,
        color: "#2563eb",
        data: {
          labels: data.map((d) => new Date(d.date)),
          data: data.map((d) => d.pred),
          lower_50: data.map((d) => d.lower_50 ?? null),
          upper_50: data.map((d) => d.upper_50 ?? null),
          lower_90: data.map((d) => d.lower_90 ?? null),
          upper_90: data.map((d) => d.upper_90 ?? null),
        },
      };

      setChartData(formattedData);
    } catch (error) {
      console.error(error);
      setChartData(null);
    } finally {
      setIsChartLoading(false);
    }
  }, [activeChartId]);

  useEffect(() => {
    if (!hasInitialized && localPredictions.length > 0) {
      const firstPublished = localPredictions.find((p) => p.published);
      if (firstPublished) {
        handleViewChart(firstPublished);
      }
      setHasInitialized(true);
    }
  }, [localPredictions, hasInitialized, handleViewChart]);

  const getDashboardLink = useCallback((pred: ModelPrediction) => {
    const params = new URLSearchParams();
    params.set("sprint", pred.sprint ? "true" : "false");
    params.set("adm_level", pred.adm_level.toString());
    params.set("disease", pred.disease_code);
    params.set("prediction_id", pred.id.toString());
    params.set("case_definition", pred.case_definition);

    if (pred.adm_0_code) params.set("adm_0", pred.adm_0_code);
    if (pred.adm_level >= 1 && pred.adm_1_code) params.set("adm_1", pred.adm_1_code);
    if (pred.adm_level >= 2 && pred.adm_2_code) params.set("adm_2", pred.adm_2_code);
    if (pred.adm_level >= 3 && pred.adm_3_code) params.set("adm_3", pred.adm_3_code);

    const cleanCategory = pred.category === "quantitative" || pred.category === "categorical"
      ? pred.category
      : "quantitative";

    return `/dashboard/${cleanCategory}?${params.toString()}`;
  }, []);

  const filteredPredictions = useMemo(() => {
    return localPredictions.filter((pred) => {
      if (!canManage && !pred.published) return false;
      if (!debouncedSearchQuery) return true;

      const query = debouncedSearchQuery.toLowerCase();
      return (
        pred.id.toString().includes(query) ||
        pred.commit.toLowerCase().includes(query) ||
        (pred.description && pred.description.toLowerCase().includes(query)) ||
        (pred.sprint && pred.sprint.toString().includes(query)) ||
        (pred.adm_0_name && pred.adm_0_name.toLowerCase().includes(query)) ||
        (pred.adm_1_name && pred.adm_1_name.toLowerCase().includes(query)) ||
        (pred.adm_2_name && pred.adm_2_name.toLowerCase().includes(query)) ||
        (pred.adm_3_name && pred.adm_3_name.toLowerCase().includes(query)) ||
        pred.date.includes(query)
      );
    });
  }, [localPredictions, debouncedSearchQuery, canManage]);

  const emptyStateMarkdown = useMemo(() => `
## ${t("model_predictions.empty_title")}

${t("model_predictions.empty_desc")}

### ${t("model_predictions.python_rec")}

\`\`\`bash
pip install mosqlient
\`\`\`

\`\`\`python
import mosqlient

api_key = "YOUR_API_KEY"

# Example of prediction format
prediction = [{
  "date": str,
  "lower_95": float,
  "lower_90": float,
  "lower_80": float,
  "lower_50": float,
  "pred": float,
  "upper_50": float,
  "upper_80": float,
  "upper_90": float,
  "upper_95": float
}]

# can also be a dataframe
prediction = pd.DataFrame(prediction)

mosqlient.upload_prediction(
  api_key=api_key,
  repository="${owner}/${modelName}",
  description=...,
  commit=...,
  prediction=prediction,
  adm_0="BRA",
  adm_1=33
)
\`\`\`

### 2. R

\`\`\`r
library(httr)
library(jsonlite)

api_key <- "YOUR_API_KEY"
url <- "https://api.mosqlimate.org/api/registry/prediction/"

payload <- list(
  repository = "${owner}/${modelName}",
  description = ...,
  commit = ...,
  adm_0 = "BRA",
  adm_1 = 33,
  prediction = list(
    list(date = "2025-01-01", pred = 150.5, ...)
  )
)

response <- POST(
  url,
  add_headers(Authorization = paste("Bearer", api_key), "Content-Type" = "application/json"),
  body = toJSON(payload, auto_unbox = TRUE)
)

print(content(response))
\`\`\`

### 3. cURL

\`\`\`bash
curl -X POST https://api.mosqlimate.org/api/registry/prediction/ \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "repository": "${owner}/${modelName}",
    "description": ...,
    "commit": ...,
    "adm_0": "BRA",
    "adm_1": 33,
    "prediction": [
      {
        "date": "2025-01-01",
        "pred": 150.5,
        "lower_50": 140.0,
        "upper_50": 160.0
      }
    ]
  }'
\`\`\`

${t("model_predictions.need_api_key")}
  `, [owner, modelName, t]);

  if (!predictions || predictions.length === 0) {
    return (
      <div className="w-full bg-card border rounded-xl shadow-sm p-8 md:p-12">
        <div className="max-w-3xl mx-auto bg-card">
          <div className="flex justify-center mb-6">
            <MarkdownRenderer content={emptyStateMarkdown} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="h-[500px] w-full mb-8">
        <div className="h-full w-full bg-card border rounded-xl shadow-sm p-4 relative flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="font-semibold text-sm text-foreground">
              {activeChartId ? t("model_predictions.prediction_id", { id: activeChartId }) : t("model_predictions.select_prediction")}
            </h3>
          </div>

          <div className="flex-1 w-full relative min-h-0">
            {isChartLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}

            {chartData ? (
              <LineChart
                data={{ labels: [], data: [] }}
                predictions={[chartData]}
                activeIntervals={new Set([chartData.id])}
                height="100%"
              />
            ) : !isChartLoading && (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm bg-bg">
                {activeChartId ? t("model_predictions.unable_load") : t("model_predictions.select_below")}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("model_predictions.search_placeholder")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-sm border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {inputValue && (
            <button
              onClick={() => setInputValue("")}
              className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 bg-muted/40 p-2 rounded-lg border">
          <span className="text-sm font-medium text-muted-foreground pl-2">{t("model_predictions.metric_label")}</span>
          <select
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value)}
            className="h-8 bg-transparent text-sm font-medium focus:outline-none cursor-pointer text-foreground"
          >
            {availableScores.map((score) => (
              <option key={score} value={score}>
                {formatScoreName(score)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredPredictions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            {debouncedSearchQuery ? t("model_predictions.no_matches") : t("model_predictions.no_found")}
          </div>
        ) : (
          filteredPredictions.map((pred) => (
            <PredictionCard
              key={pred.id}
              pred={pred}
              canManage={canManage}
              selectedMetric={selectedMetric}
              isUpdating={isUpdating === pred.id}
              isActiveChart={activeChartId === pred.id}
              onToggle={handlePublishToggle}
              onViewChart={handleViewChart}
              formatDate={formatDate}
              formatScoreName={formatScoreName}
              getDashboardLink={getDashboardLink}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}
